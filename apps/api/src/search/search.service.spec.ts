import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { SearchService } from './search.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { FriendshipService } from '../friendship/friendship.service';
import { BlockService } from '../block/block.service';
import { SearchType } from './dto/search-query.dto';

describe('SearchService', () => {
  let service: SearchService;

  const mockEsService = {
    search: jest.fn(),
  };

  const mockFriendshipService = {
    getFriendIds: jest.fn(),
  };

  const mockBlockService = {
    getBlockedUserIds: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: ElasticsearchService, useValue: mockEsService },
        { provide: FriendshipService, useValue: mockFriendshipService },
        { provide: BlockService, useValue: mockBlockService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUserHits = {
    hits: {
      total: { value: 1 },
      hits: [
        {
          _source: {
            userId: 'user-1',
            displayName: 'John Doe',
            firstName: 'John',
            lastName: 'Doe',
            bio: 'Hello',
            location: 'NYC',
          },
          highlight: { displayName: ['<em>John</em> Doe'] },
        },
      ],
    },
  };

  const mockPostHits = {
    hits: {
      total: { value: 1 },
      hits: [
        {
          _source: {
            postId: 'post-1',
            authorId: 'user-1',
            authorName: 'John Doe',
            content: 'Hello world',
            visibility: 'PUBLIC',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          highlight: { content: ['<em>Hello</em> world'] },
        },
      ],
    },
  };

  describe('search - type ALL', () => {
    it('should return combined users and posts results', async () => {
      mockBlockService.getBlockedUserIds.mockResolvedValue([]);
      mockFriendshipService.getFriendIds.mockResolvedValue([]);
      mockEsService.search
        .mockResolvedValueOnce(mockUserHits) // users query
        .mockResolvedValueOnce(mockPostHits); // posts query

      const result = await service.search('current-user', 'John', SearchType.ALL, 1, 20);
      const data = result.data as { users: { items: any[]; total: number }; posts: { items: any[]; total: number } };

      expect(data.users.items).toHaveLength(1);
      expect(data.posts.items).toHaveLength(1);
      expect(data.users.items[0].userId).toBe('user-1');
      expect(data.posts.items[0].postId).toBe('post-1');
    });
  });

  describe('search - type USERS', () => {
    it('should return paginated user results', async () => {
      mockBlockService.getBlockedUserIds.mockResolvedValue([]);
      mockEsService.search.mockResolvedValue(mockUserHits);

      const result = await service.search('current-user', 'John', SearchType.USERS, 1, 20);

      expect(result.data).toHaveLength(1);
      expect((result as any).meta.total).toBe(1);
      expect((result as any).meta.totalPages).toBe(1);
    });

    it('should filter out blocked users', async () => {
      mockBlockService.getBlockedUserIds.mockResolvedValue(['user-1']);
      mockEsService.search.mockResolvedValue({ hits: { total: { value: 0 }, hits: [] } });

      const result = await service.search('current-user', 'John', SearchType.USERS, 1, 20);

      expect(result.data).toHaveLength(0);
      // Verify blocked IDs are passed in must_not
      const searchCall = mockEsService.search.mock.calls[0];
      const mustNot = searchCall[1].query.bool.must_not;
      expect(mustNot).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ terms: { userId: ['user-1'] } }),
        ]),
      );
    });
  });

  describe('search - type POSTS', () => {
    it('should return paginated post results', async () => {
      mockBlockService.getBlockedUserIds.mockResolvedValue([]);
      mockFriendshipService.getFriendIds.mockResolvedValue(['friend-1']);
      mockEsService.search.mockResolvedValue(mockPostHits);

      const result = await service.search('current-user', 'Hello', SearchType.POSTS, 1, 20);

      expect(result.data).toHaveLength(1);
      expect((result as any).meta.total).toBe(1);
    });

    it('should include visibility filter with friend IDs', async () => {
      mockBlockService.getBlockedUserIds.mockResolvedValue([]);
      mockFriendshipService.getFriendIds.mockResolvedValue(['friend-1']);
      mockEsService.search.mockResolvedValue(mockPostHits);

      await service.search('current-user', 'Hello', SearchType.POSTS, 1, 20);

      const searchCall = mockEsService.search.mock.calls[0];
      const query = searchCall[1].query;
      // Should have visibility filter in must
      expect(query.bool.must).toHaveLength(2);
    });
  });

  describe('search - error handling', () => {
    it('should throw 503 when ES is unavailable', async () => {
      mockBlockService.getBlockedUserIds.mockResolvedValue([]);
      mockFriendshipService.getFriendIds.mockResolvedValue([]);
      mockEsService.search.mockRejectedValue(new Error('Connection refused'));

      await expect(
        service.search('current-user', 'test', SearchType.USERS, 1, 20),
      ).rejects.toThrow(HttpException);

      try {
        await service.search('current-user', 'test', SearchType.USERS, 1, 20);
      } catch (e: any) {
        expect(e.getStatus()).toBe(503);
        expect(e.getResponse()).toBe('Search temporarily unavailable');
      }
    });
  });
});

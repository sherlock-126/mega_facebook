import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchIndexerService } from './search-indexer.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchType } from './dto/search-query.dto';

describe('SearchController', () => {
  let controller: SearchController;

  const mockSearchService = {
    search: jest.fn(),
  };

  const mockIndexerService = {
    bulkIndexUsers: jest.fn(),
    bulkIndexPosts: jest.fn(),
  };

  const mockPrisma = {
    user: { findMany: jest.fn() },
    post: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        { provide: SearchService, useValue: mockSearchService },
        { provide: SearchIndexerService, useValue: mockIndexerService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should return search results with success wrapper', async () => {
      const searchResult = {
        data: { users: { items: [], total: 0 }, posts: { items: [], total: 0 } },
        meta: { page: 1, limit: 20, query: 'test' },
      };
      mockSearchService.search.mockResolvedValue(searchResult);

      const result = await controller.search(
        { user: { userId: 'user-1' } },
        { q: 'test', type: SearchType.ALL, page: 1, limit: 20 },
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockSearchService.search).toHaveBeenCalledWith(
        'user-1',
        'test',
        SearchType.ALL,
        1,
        20,
      );
    });

    it('should pass default values for optional params', async () => {
      mockSearchService.search.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      await controller.search(
        { user: { userId: 'user-1' } },
        { q: 'test' },
      );

      expect(mockSearchService.search).toHaveBeenCalledWith(
        'user-1',
        'test',
        SearchType.ALL,
        1,
        20,
      );
    });
  });

  describe('reindex', () => {
    it('should reindex all data', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          status: 'ACTIVE',
          createdAt: new Date(),
          profile: {
            firstName: 'John',
            lastName: 'Doe',
            displayName: 'JohnD',
            bio: null,
            location: null,
            avatarKey: null,
          },
        },
      ]);
      mockPrisma.post.findMany.mockResolvedValue([
        {
          id: 'post-1',
          authorId: 'user-1',
          content: 'Hello',
          visibility: 'PUBLIC',
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { profile: { displayName: 'JohnD', avatarKey: null } },
        },
      ]);
      mockIndexerService.bulkIndexUsers.mockResolvedValue(1);
      mockIndexerService.bulkIndexPosts.mockResolvedValue(1);

      const result = await controller.reindex({});

      expect(result.success).toBe(true);
      expect(result.data.usersIndexed).toBe(1);
      expect(result.data.postsIndexed).toBe(1);
    });

    it('should skip users without profile in reindex', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', status: 'ACTIVE', createdAt: new Date(), profile: null },
      ]);
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockIndexerService.bulkIndexUsers.mockResolvedValue(0);
      mockIndexerService.bulkIndexPosts.mockResolvedValue(0);

      const result = await controller.reindex({});

      expect(result.data.usersIndexed).toBe(0);
      // bulkIndexUsers called with empty array (filtered out users without profile)
      expect(mockIndexerService.bulkIndexUsers).toHaveBeenCalledWith([]);
    });

    it('should reindex only users when target=users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockIndexerService.bulkIndexUsers.mockResolvedValue(0);

      const result = await controller.reindex({ target: 'users' as any });

      expect(result.data.usersIndexed).toBe(0);
      expect(result.data.postsIndexed).toBeUndefined();
      expect(mockPrisma.post.findMany).not.toHaveBeenCalled();
    });
  });
});

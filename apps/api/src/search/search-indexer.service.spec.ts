import { Test, TestingModule } from '@nestjs/testing';
import { SearchIndexerService } from './search-indexer.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';

describe('SearchIndexerService', () => {
  let service: SearchIndexerService;

  const mockEsService = {
    index: jest.fn(),
    delete: jest.fn(),
    bulk: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchIndexerService,
        { provide: ElasticsearchService, useValue: mockEsService },
      ],
    }).compile();

    service = module.get<SearchIndexerService>(SearchIndexerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUserData = {
    userId: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'JohnD',
    bio: 'Hello world',
    location: 'NYC',
    avatarKey: 'avatars/user-1.jpg',
    status: 'ACTIVE',
    createdAt: new Date('2024-01-01'),
  };

  const mockPostData = {
    postId: 'post-1',
    authorId: 'user-1',
    authorName: 'JohnD',
    authorAvatar: null,
    content: 'Test post content',
    visibility: 'PUBLIC',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  describe('indexUser', () => {
    it('should index an active user', async () => {
      mockEsService.index.mockResolvedValue({});

      await service.indexUser(mockUserData);

      expect(mockEsService.index).toHaveBeenCalledWith(
        'users',
        'user-1',
        expect.objectContaining({ userId: 'user-1', displayName: 'JohnD' }),
      );
    });

    it('should remove a suspended user instead of indexing', async () => {
      mockEsService.delete.mockResolvedValue({});

      await service.indexUser({ ...mockUserData, status: 'SUSPENDED' });

      expect(mockEsService.delete).toHaveBeenCalledWith('users', 'user-1');
      expect(mockEsService.index).not.toHaveBeenCalled();
    });

    it('should not throw on ES failure', async () => {
      mockEsService.index.mockRejectedValue(new Error('Connection refused'));

      await expect(service.indexUser(mockUserData)).resolves.not.toThrow();
    });
  });

  describe('removeUser', () => {
    it('should remove a user from the index', async () => {
      mockEsService.delete.mockResolvedValue({});

      await service.removeUser('user-1');

      expect(mockEsService.delete).toHaveBeenCalledWith('users', 'user-1');
    });

    it('should not throw on ES failure', async () => {
      mockEsService.delete.mockRejectedValue(new Error('Connection refused'));

      await expect(service.removeUser('user-1')).resolves.not.toThrow();
    });
  });

  describe('indexPost', () => {
    it('should index a post', async () => {
      mockEsService.index.mockResolvedValue({});

      await service.indexPost(mockPostData);

      expect(mockEsService.index).toHaveBeenCalledWith(
        'posts',
        'post-1',
        expect.objectContaining({ postId: 'post-1', content: 'Test post content' }),
      );
    });

    it('should not throw on ES failure', async () => {
      mockEsService.index.mockRejectedValue(new Error('Connection refused'));

      await expect(service.indexPost(mockPostData)).resolves.not.toThrow();
    });
  });

  describe('removePost', () => {
    it('should remove a post from the index', async () => {
      mockEsService.delete.mockResolvedValue({});

      await service.removePost('post-1');

      expect(mockEsService.delete).toHaveBeenCalledWith('posts', 'post-1');
    });

    it('should not throw on ES failure', async () => {
      mockEsService.delete.mockRejectedValue(new Error('Connection refused'));

      await expect(service.removePost('post-1')).resolves.not.toThrow();
    });
  });

  describe('bulkIndexUsers', () => {
    it('should bulk index users', async () => {
      mockEsService.bulk.mockResolvedValue({});

      const count = await service.bulkIndexUsers([mockUserData]);

      expect(count).toBe(1);
      expect(mockEsService.bulk).toHaveBeenCalled();
    });

    it('should return 0 for empty array', async () => {
      const count = await service.bulkIndexUsers([]);

      expect(count).toBe(0);
      expect(mockEsService.bulk).not.toHaveBeenCalled();
    });

    it('should return 0 on ES failure', async () => {
      mockEsService.bulk.mockRejectedValue(new Error('Connection refused'));

      const count = await service.bulkIndexUsers([mockUserData]);

      expect(count).toBe(0);
    });
  });

  describe('bulkIndexPosts', () => {
    it('should bulk index posts', async () => {
      mockEsService.bulk.mockResolvedValue({});

      const count = await service.bulkIndexPosts([mockPostData]);

      expect(count).toBe(1);
      expect(mockEsService.bulk).toHaveBeenCalled();
    });

    it('should return 0 for empty array', async () => {
      const count = await service.bulkIndexPosts([]);

      expect(count).toBe(0);
      expect(mockEsService.bulk).not.toHaveBeenCalled();
    });
  });
});

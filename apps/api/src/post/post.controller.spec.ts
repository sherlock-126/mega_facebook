import { Test, TestingModule } from '@nestjs/testing';
import { PostController } from './post.controller';
import { PostService } from './post.service';

describe('PostController', () => {
  let controller: PostController;

  const mockPostService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findByUser: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        { provide: PostService, useValue: mockPostService },
      ],
    }).compile();

    controller = module.get<PostController>(PostController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockReq = { user: { userId: 'user-1' } };
  const mockPostResponse = {
    id: 'post-1',
    authorId: 'user-1',
    author: { displayName: 'Test User', avatarUrl: null },
    content: 'Hello',
    visibility: 'PUBLIC',
    media: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isEdited: false,
  };

  describe('create', () => {
    it('should create a post and return success', async () => {
      mockPostService.create.mockResolvedValue(mockPostResponse);

      const result = await controller.create(
        mockReq,
        { content: 'Hello' },
        [],
      );

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('post-1');
      expect(mockPostService.create).toHaveBeenCalledWith('user-1', { content: 'Hello' }, []);
    });
  });

  describe('findOne', () => {
    it('should return a single post', async () => {
      mockPostService.findOne.mockResolvedValue(mockPostResponse);

      const result = await controller.findOne(mockReq, 'post-1');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('post-1');
    });
  });

  describe('listByUser', () => {
    it('should list posts for a user', async () => {
      mockPostService.findByUser.mockResolvedValue({
        data: [mockPostResponse],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });

      const result = await controller.listByUser(
        mockReq,
        'user-1',
        { page: 1, limit: 20 } as any,
      );

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
    });
  });

  describe('update', () => {
    it('should update a post', async () => {
      const updated = { ...mockPostResponse, content: 'Updated' };
      mockPostService.update.mockResolvedValue(updated);

      const result = await controller.update(mockReq, 'post-1', { content: 'Updated' });

      expect(result.success).toBe(true);
      expect(result.data.content).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should soft delete a post', async () => {
      mockPostService.softDelete.mockResolvedValue({ message: 'Post deleted' });

      const result = await controller.remove(mockReq, 'post-1');

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Post deleted');
    });
  });

  describe('create without files', () => {
    it('should call service with undefined files', async () => {
      mockPostService.create.mockResolvedValue(mockPostResponse);

      const result = await controller.create(
        mockReq,
        { content: 'Text only' },
        undefined,
      );

      expect(result.success).toBe(true);
      expect(mockPostService.create).toHaveBeenCalledWith('user-1', { content: 'Text only' }, undefined);
    });
  });

  describe('listByUser with defaults', () => {
    it('should use default pagination', async () => {
      mockPostService.findByUser.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      const result = await controller.listByUser(
        mockReq,
        'other-user',
        {} as any,
      );

      expect(result.success).toBe(true);
      expect(mockPostService.findByUser).toHaveBeenCalledWith('other-user', 'user-1', 1, 20);
    });
  });

  describe('update with visibility', () => {
    it('should update visibility', async () => {
      const updated = { ...mockPostResponse, visibility: 'FRIENDS_ONLY' };
      mockPostService.update.mockResolvedValue(updated);

      const result = await controller.update(mockReq, 'post-1', { visibility: 'FRIENDS_ONLY' as any });

      expect(result.success).toBe(true);
      expect(result.data.visibility).toBe('FRIENDS_ONLY');
    });
  });

  describe('findOne delegates to service', () => {
    it('should pass correct params', async () => {
      mockPostService.findOne.mockResolvedValue(mockPostResponse);

      await controller.findOne(mockReq, 'some-uuid');

      expect(mockPostService.findOne).toHaveBeenCalledWith('some-uuid', 'user-1');
    });
  });

  describe('remove delegates to service', () => {
    it('should pass correct params', async () => {
      mockPostService.softDelete.mockResolvedValue({ message: 'Post deleted' });

      await controller.remove(mockReq, 'some-uuid');

      expect(mockPostService.softDelete).toHaveBeenCalledWith('some-uuid', 'user-1');
    });
  });
});

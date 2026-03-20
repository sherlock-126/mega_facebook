import { Test, TestingModule } from '@nestjs/testing';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

describe('CommentController', () => {
  let controller: CommentController;

  const mockCommentService = {
    create: jest.fn(),
    listByPost: jest.fn(),
    listReplies: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [
        { provide: CommentService, useValue: mockCommentService },
      ],
    }).compile();

    controller = module.get<CommentController>(CommentController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const req = { user: { userId: 'user-1' } };

  describe('create', () => {
    it('should create a comment', async () => {
      const commentData = { id: 'c1', content: 'Test' };
      mockCommentService.create.mockResolvedValue(commentData);

      const result = await controller.create(req, {
        postId: 'post-1',
        content: 'Test',
      });

      expect(result).toEqual({ success: true, data: commentData });
    });
  });

  describe('listByPost', () => {
    it('should list comments', async () => {
      const listResult = {
        data: [{ id: 'c1' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockCommentService.listByPost.mockResolvedValue(listResult);

      const result = await controller.listByPost(req, 'post-1', {
        page: 1,
        limit: 20,
      } as any);

      expect(result).toEqual({ success: true, ...listResult });
    });
  });

  describe('listReplies', () => {
    it('should list replies', async () => {
      const repliesResult = {
        data: [{ id: 'r1' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockCommentService.listReplies.mockResolvedValue(repliesResult);

      const result = await controller.listReplies('c1', { page: 1, limit: 20 } as any);

      expect(result).toEqual({ success: true, ...repliesResult });
    });
  });

  describe('update', () => {
    it('should update a comment', async () => {
      const updated = { id: 'c1', content: 'Updated' };
      mockCommentService.update.mockResolvedValue(updated);

      const result = await controller.update(req, 'c1', { content: 'Updated' });

      expect(result).toEqual({ success: true, data: updated });
    });
  });

  describe('remove', () => {
    it('should soft delete a comment', async () => {
      mockCommentService.softDelete.mockResolvedValue({ message: 'Comment deleted' });

      const result = await controller.remove(req, 'c1');

      expect(result).toEqual({ success: true, data: { message: 'Comment deleted' } });
    });
  });
});

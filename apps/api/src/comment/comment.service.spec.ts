import { Test, TestingModule } from '@nestjs/testing';
import { CommentService } from './comment.service';
import { PrismaService } from '../prisma/prisma.service';
import { PostService } from '../post/post.service';
import { MediaService } from '../media/media.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('CommentService', () => {
  let service: CommentService;

  const mockPrisma: any = {
    comment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPostService = {
    findOne: jest.fn(),
  };

  const mockMedia = {
    getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.test'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PostService, useValue: mockPostService },
        { provide: MediaService, useValue: mockMedia },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockComment = {
    id: 'c1',
    postId: 'post-1',
    userId: 'user-1',
    parentId: null,
    content: 'Test comment',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    user: { profile: { displayName: 'Test User', avatarKey: null } },
    _count: { replies: 0 },
  };

  describe('create', () => {
    it('should create a top-level comment', async () => {
      mockPostService.findOne.mockResolvedValue({});
      mockPrisma.comment.create.mockResolvedValue(mockComment);

      const result = await service.create('user-1', {
        postId: 'post-1',
        content: 'Test comment',
      });

      expect(result.id).toBe('c1');
      expect(result.content).toBe('Test comment');
      expect(mockPostService.findOne).toHaveBeenCalledWith('post-1', 'user-1');
    });

    it('should create a reply to a comment', async () => {
      mockPostService.findOne.mockResolvedValue({});
      mockPrisma.comment.findFirst.mockResolvedValue({
        id: 'parent-1',
        postId: 'post-1',
        parentId: null,
        deletedAt: null,
      });
      const reply = { ...mockComment, id: 'c2', parentId: 'parent-1' };
      mockPrisma.comment.create.mockResolvedValue(reply);

      const result = await service.create('user-1', {
        postId: 'post-1',
        parentId: 'parent-1',
        content: 'Reply',
      });

      expect(result.parentId).toBe('parent-1');
    });

    it('should throw if parent comment not found', async () => {
      mockPostService.findOne.mockResolvedValue({});
      mockPrisma.comment.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          postId: 'post-1',
          parentId: 'nonexistent',
          content: 'Reply',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if replying to a reply (3rd level)', async () => {
      mockPostService.findOne.mockResolvedValue({});
      mockPrisma.comment.findFirst.mockResolvedValue({
        id: 'reply-1',
        postId: 'post-1',
        parentId: 'parent-1',
        deletedAt: null,
      });

      await expect(
        service.create('user-1', {
          postId: 'post-1',
          parentId: 'reply-1',
          content: 'Nested reply',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if parent belongs to different post', async () => {
      mockPostService.findOne.mockResolvedValue({});
      mockPrisma.comment.findFirst.mockResolvedValue({
        id: 'parent-1',
        postId: 'other-post',
        parentId: null,
        deletedAt: null,
      });

      await expect(
        service.create('user-1', {
          postId: 'post-1',
          parentId: 'parent-1',
          content: 'Reply',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listByPost', () => {
    it('should list top-level comments', async () => {
      mockPostService.findOne.mockResolvedValue({});
      mockPrisma.comment.findMany.mockResolvedValue([mockComment]);
      mockPrisma.comment.count.mockResolvedValue(1);

      const result = await service.listByPost('post-1', 'user-1', 1, 20);

      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
    });

    it('should return empty list with zero total', async () => {
      mockPostService.findOne.mockResolvedValue({});
      mockPrisma.comment.findMany.mockResolvedValue([]);
      mockPrisma.comment.count.mockResolvedValue(0);

      const result = await service.listByPost('post-1', 'user-1', 1, 20);

      expect(result.data.length).toBe(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('listReplies', () => {
    it('should list replies for a comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue({ id: 'c1' });
      const reply = { ...mockComment, id: 'r1', parentId: 'c1' };
      mockPrisma.comment.findMany.mockResolvedValue([reply]);
      mockPrisma.comment.count.mockResolvedValue(1);

      const result = await service.listReplies('c1', 1, 20);

      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
    });

    it('should throw 404 if parent comment not found', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(null);

      await expect(service.listReplies('nonexistent', 1, 20)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update own comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);
      const updated = {
        ...mockComment,
        content: 'Updated',
        updatedAt: new Date('2024-01-02'),
      };
      mockPrisma.comment.update.mockResolvedValue(updated);

      const result = await service.update('c1', 'user-1', { content: 'Updated' });
      expect(result.content).toBe('Updated');
      expect(result.isEdited).toBe(true);
    });

    it('should throw 404 for non-existent comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', 'user-1', { content: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw 403 for non-author', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);

      await expect(
        service.update('c1', 'other-user', { content: 'test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequest for deleted comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue({
        ...mockComment,
        deletedAt: new Date(),
      });

      await expect(
        service.update('c1', 'user-1', { content: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('softDelete', () => {
    it('should soft delete own comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);
      mockPrisma.comment.update.mockResolvedValue({
        ...mockComment,
        deletedAt: new Date(),
      });

      const result = await service.softDelete('c1', 'user-1');
      expect(result.message).toBe('Comment deleted');
    });

    it('should throw 403 for non-author delete', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);

      await expect(service.softDelete('c1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw 404 for non-existent comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(null);

      await expect(service.softDelete('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw 404 for already deleted comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue({
        ...mockComment,
        deletedAt: new Date(),
      });

      await expect(service.softDelete('c1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

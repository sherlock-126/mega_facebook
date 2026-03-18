import { Test, TestingModule } from '@nestjs/testing';
import { PostService } from './post.service';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { FriendshipService } from '../friendship/friendship.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostVisibility } from '@prisma/client';

describe('PostService', () => {
  let service: PostService;

  const mockPrisma: any = {
    post: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn(mockPrisma)),
  };

  const mockMedia = {
    upload: jest.fn(),
    getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.test'),
    delete: jest.fn(),
  };

  const mockFriendship = {
    getStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MediaService, useValue: mockMedia },
        { provide: FriendshipService, useValue: mockFriendship },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockPost = {
    id: 'post-1',
    authorId: 'user-1',
    content: 'Hello world',
    visibility: PostVisibility.PUBLIC,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    media: [],
    author: { profile: { displayName: 'Test User', avatarKey: null } },
  };

  describe('create', () => {
    it('should create a text-only post', async () => {
      mockPrisma.post.create.mockResolvedValue(mockPost);

      const result = await service.create('user-1', { content: 'Hello world' });

      expect(result.id).toBe('post-1');
      expect(result.content).toBe('Hello world');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw if no content and no files', async () => {
      await expect(
        service.create('user-1', { content: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if no content and no files (undefined)', async () => {
      await expect(
        service.create('user-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if too many files', async () => {
      const files = Array.from({ length: 11 }, (_, i) => ({
        originalname: `img${i}.jpg`,
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
      })) as Express.Multer.File[];

      await expect(
        service.create('user-1', { content: 'test' }, files),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create post with media', async () => {
      const postWithMedia = {
        ...mockPost,
        media: [
          { id: 'm1', mediaKey: 'posts/user-1/abc.jpg', mimeType: 'image/jpeg', position: 0 },
        ],
      };
      mockPrisma.post.create.mockResolvedValue(postWithMedia);
      mockMedia.upload.mockResolvedValue({ key: 'posts/user-1/abc.jpg' });

      const files = [{
        originalname: 'photo.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
      }] as Express.Multer.File[];

      const result = await service.create('user-1', { content: 'test' }, files);
      expect(result.media.length).toBe(1);
      expect(mockMedia.upload).toHaveBeenCalledTimes(1);
    });

    it('should cleanup S3 on transaction failure', async () => {
      mockMedia.upload.mockResolvedValue({ key: 'test-key' });
      mockPrisma.post.create.mockRejectedValue(new Error('DB error'));

      const files = [{
        originalname: 'photo.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
      }] as Express.Multer.File[];

      await expect(
        service.create('user-1', { content: 'test' }, files),
      ).rejects.toThrow('DB error');
      expect(mockMedia.delete).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a public post', async () => {
      mockPrisma.post.findFirst.mockResolvedValue(mockPost);

      const result = await service.findOne('post-1', 'other-user');
      expect(result.id).toBe('post-1');
    });

    it('should throw 404 for non-existent post', async () => {
      mockPrisma.post.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow author to view their own FRIENDS_ONLY post', async () => {
      const friendsPost = { ...mockPost, visibility: PostVisibility.FRIENDS_ONLY };
      mockPrisma.post.findFirst.mockResolvedValue(friendsPost);

      const result = await service.findOne('post-1', 'user-1');
      expect(result.id).toBe('post-1');
      expect(mockFriendship.getStatus).not.toHaveBeenCalled();
    });

    it('should allow friends to view FRIENDS_ONLY post', async () => {
      const friendsPost = { ...mockPost, visibility: PostVisibility.FRIENDS_ONLY };
      mockPrisma.post.findFirst.mockResolvedValue(friendsPost);
      mockFriendship.getStatus.mockResolvedValue({ status: 'FRIENDS' });

      const result = await service.findOne('post-1', 'friend-user');
      expect(result.id).toBe('post-1');
    });

    it('should deny non-friends from viewing FRIENDS_ONLY post', async () => {
      const friendsPost = { ...mockPost, visibility: PostVisibility.FRIENDS_ONLY };
      mockPrisma.post.findFirst.mockResolvedValue(friendsPost);
      mockFriendship.getStatus.mockResolvedValue({ status: 'NONE' });

      await expect(
        service.findOne('post-1', 'stranger'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByUser', () => {
    it('should return own posts (all visibility)', async () => {
      mockPrisma.post.findMany.mockResolvedValue([mockPost]);
      mockPrisma.post.count.mockResolvedValue(1);

      const result = await service.findByUser('user-1', 'user-1', 1, 20);
      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter visibility for non-friends', async () => {
      mockFriendship.getStatus.mockResolvedValue({ status: 'NONE' });
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      const result = await service.findByUser('user-1', 'stranger', 1, 20);
      expect(result.data.length).toBe(0);
    });
  });

  describe('update', () => {
    it('should update own post', async () => {
      mockPrisma.post.findFirst.mockResolvedValue(mockPost);
      const updatedPost = { ...mockPost, content: 'Updated', updatedAt: new Date('2024-01-02') };
      mockPrisma.post.update.mockResolvedValue(updatedPost);

      const result = await service.update('post-1', 'user-1', { content: 'Updated' });
      expect(result.content).toBe('Updated');
      expect(result.isEdited).toBe(true);
    });

    it('should throw 404 for non-existent post', async () => {
      mockPrisma.post.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', 'user-1', { content: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw 403 for non-author', async () => {
      mockPrisma.post.findFirst.mockResolvedValue(mockPost);

      await expect(
        service.update('post-1', 'other-user', { content: 'test' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('softDelete', () => {
    it('should soft delete own post', async () => {
      mockPrisma.post.findFirst.mockResolvedValue(mockPost);
      mockPrisma.post.update.mockResolvedValue({
        ...mockPost,
        deletedAt: new Date(),
      });

      const result = await service.softDelete('post-1', 'user-1');
      expect(result.message).toBe('Post deleted');
    });

    it('should throw 403 for non-author delete', async () => {
      mockPrisma.post.findFirst.mockResolvedValue(mockPost);

      await expect(
        service.softDelete('post-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw 404 for already deleted post', async () => {
      mockPrisma.post.findFirst.mockResolvedValue(null);

      await expect(
        service.softDelete('post-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

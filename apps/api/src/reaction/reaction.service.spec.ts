import { Test, TestingModule } from '@nestjs/testing';
import { ReactionService } from './reaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { PostService } from '../post/post.service';
import { MediaService } from '../media/media.service';
import { NotFoundException } from '@nestjs/common';
import { ReactionTargetType, ReactionType } from '@prisma/client';

describe('ReactionService', () => {
  let service: ReactionService;

  const mockPrisma: any = {
    reaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    comment: {
      findFirst: jest.fn(),
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
        ReactionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PostService, useValue: mockPostService },
        { provide: MediaService, useValue: mockMedia },
      ],
    }).compile();

    service = module.get<ReactionService>(ReactionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('toggle', () => {
    const dto = {
      targetType: ReactionTargetType.POST,
      targetId: 'post-1',
      type: ReactionType.LIKE,
    };

    it('should create a new reaction', async () => {
      mockPostService.findOne.mockResolvedValue({});
      mockPrisma.reaction.findUnique.mockResolvedValue(null);
      const created = { id: 'r1', userId: 'user-1', ...dto, createdAt: new Date() };
      mockPrisma.reaction.create.mockResolvedValue(created);

      const result = await service.toggle('user-1', dto);
      expect(result).toEqual(created);
      expect(mockPrisma.reaction.create).toHaveBeenCalled();
    });

    it('should remove reaction when same type toggled', async () => {
      mockPostService.findOne.mockResolvedValue({});
      mockPrisma.reaction.findUnique.mockResolvedValue({
        id: 'r1',
        type: ReactionType.LIKE,
      });
      mockPrisma.reaction.delete.mockResolvedValue({});

      const result = await service.toggle('user-1', dto);
      expect(result).toEqual({ removed: true, message: 'Reaction removed' });
      expect(mockPrisma.reaction.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });

    it('should update reaction when different type toggled', async () => {
      mockPostService.findOne.mockResolvedValue({});
      mockPrisma.reaction.findUnique.mockResolvedValue({
        id: 'r1',
        type: ReactionType.LIKE,
      });
      const updated = { id: 'r1', type: ReactionType.LOVE };
      mockPrisma.reaction.update.mockResolvedValue(updated);

      const result = await service.toggle('user-1', {
        ...dto,
        type: ReactionType.LOVE,
      });
      expect(result).toEqual(updated);
    });

    it('should handle P2002 race condition', async () => {
      mockPostService.findOne.mockResolvedValue({});
      mockPrisma.reaction.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'r1', type: ReactionType.LIKE });
      mockPrisma.reaction.create.mockRejectedValue({ code: 'P2002' });

      const result = await service.toggle('user-1', dto);
      expect(result).toEqual({ id: 'r1', type: ReactionType.LIKE });
    });

    it('should validate target is a comment and check post access', async () => {
      const commentDto = {
        targetType: ReactionTargetType.COMMENT,
        targetId: 'comment-1',
        type: ReactionType.LIKE,
      };
      mockPrisma.comment.findFirst.mockResolvedValue({
        id: 'comment-1',
        postId: 'post-1',
        deletedAt: null,
        post: {},
      });
      mockPostService.findOne.mockResolvedValue({});
      mockPrisma.reaction.findUnique.mockResolvedValue(null);
      const created = { id: 'r2', userId: 'user-1', ...commentDto, createdAt: new Date() };
      mockPrisma.reaction.create.mockResolvedValue(created);

      const result = await service.toggle('user-1', commentDto);
      expect(result).toEqual(created);
      expect(mockPrisma.comment.findFirst).toHaveBeenCalled();
      expect(mockPostService.findOne).toHaveBeenCalledWith('post-1', 'user-1');
    });

    it('should throw 404 for deleted comment target', async () => {
      const commentDto = {
        targetType: ReactionTargetType.COMMENT,
        targetId: 'comment-1',
        type: ReactionType.LIKE,
      };
      mockPrisma.comment.findFirst.mockResolvedValue(null);

      await expect(service.toggle('user-1', commentDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove an existing reaction', async () => {
      mockPrisma.reaction.findUnique.mockResolvedValue({ id: 'r1' });
      mockPrisma.reaction.delete.mockResolvedValue({});

      const result = await service.remove('user-1', ReactionTargetType.POST, 'post-1');
      expect(result).toEqual({ message: 'Reaction removed' });
    });

    it('should throw 404 if no reaction exists', async () => {
      mockPrisma.reaction.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('user-1', ReactionTargetType.POST, 'post-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSummary', () => {
    it('should return reaction summary with user reaction', async () => {
      mockPrisma.reaction.groupBy.mockResolvedValue([
        { type: ReactionType.LIKE, _count: { type: 5 } },
        { type: ReactionType.LOVE, _count: { type: 3 } },
      ]);
      mockPrisma.reaction.findUnique.mockResolvedValue({ type: ReactionType.LIKE });

      const result = await service.getSummary(
        'user-1',
        ReactionTargetType.POST,
        'post-1',
      );

      expect(result.totalCount).toBe(8);
      expect(result.byType).toEqual({ LIKE: 5, LOVE: 3 });
      expect(result.topTypes).toEqual([ReactionType.LIKE, ReactionType.LOVE]);
      expect(result.userReaction).toEqual({ type: ReactionType.LIKE });
    });

    it('should return null userReaction when user has not reacted', async () => {
      mockPrisma.reaction.groupBy.mockResolvedValue([]);
      mockPrisma.reaction.findUnique.mockResolvedValue(null);

      const result = await service.getSummary(
        'user-1',
        ReactionTargetType.POST,
        'post-1',
      );

      expect(result.totalCount).toBe(0);
      expect(result.userReaction).toBeNull();
    });
  });

  describe('getUsers', () => {
    it('should return paginated user list', async () => {
      mockPrisma.reaction.findMany.mockResolvedValue([
        {
          userId: 'u1',
          type: ReactionType.LIKE,
          createdAt: new Date(),
          user: { profile: { displayName: 'User 1', avatarKey: null } },
        },
      ]);
      mockPrisma.reaction.count.mockResolvedValue(1);

      const result = await service.getUsers(
        ReactionTargetType.POST,
        'post-1',
        undefined,
        1,
        20,
      );

      expect(result.data.length).toBe(1);
      expect(result.data[0].displayName).toBe('User 1');
      expect(result.meta.total).toBe(1);
    });

    it('should filter by reaction type', async () => {
      mockPrisma.reaction.findMany.mockResolvedValue([]);
      mockPrisma.reaction.count.mockResolvedValue(0);

      const result = await service.getUsers(
        ReactionTargetType.POST,
        'post-1',
        ReactionType.LOVE,
        1,
        20,
      );

      expect(result.data.length).toBe(0);
      expect(result.meta.total).toBe(0);
    });

    it('should return signed avatar URL when avatarKey exists', async () => {
      mockPrisma.reaction.findMany.mockResolvedValue([
        {
          userId: 'u1',
          type: ReactionType.LIKE,
          createdAt: new Date(),
          user: { profile: { displayName: 'User 1', avatarKey: 'avatars/u1.jpg' } },
        },
      ]);
      mockPrisma.reaction.count.mockResolvedValue(1);

      const result = await service.getUsers(
        ReactionTargetType.POST,
        'post-1',
        undefined,
        1,
        20,
      );

      expect(result.data[0].avatarUrl).toBe('https://signed-url.test');
      expect(mockMedia.getSignedUrl).toHaveBeenCalledWith('avatars/u1.jpg');
    });
  });
});

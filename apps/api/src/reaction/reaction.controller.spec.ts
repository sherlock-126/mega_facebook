import { Test, TestingModule } from '@nestjs/testing';
import { ReactionController } from './reaction.controller';
import { ReactionService } from './reaction.service';
import { ReactionTargetType, ReactionType } from '@prisma/client';

describe('ReactionController', () => {
  let controller: ReactionController;

  const mockReactionService = {
    toggle: jest.fn(),
    remove: jest.fn(),
    getSummary: jest.fn(),
    getUsers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReactionController],
      providers: [
        { provide: ReactionService, useValue: mockReactionService },
      ],
    }).compile();

    controller = module.get<ReactionController>(ReactionController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const req = { user: { userId: 'user-1' } };

  describe('toggle', () => {
    it('should toggle a reaction', async () => {
      const reactionData = { id: 'r1', type: ReactionType.LIKE };
      mockReactionService.toggle.mockResolvedValue(reactionData);

      const result = await controller.toggle(req, {
        targetType: ReactionTargetType.POST,
        targetId: 'post-1',
        type: ReactionType.LIKE,
      });

      expect(result).toEqual({ success: true, data: reactionData });
    });
  });

  describe('remove', () => {
    it('should remove a reaction', async () => {
      mockReactionService.remove.mockResolvedValue({ message: 'Reaction removed' });

      const result = await controller.remove(
        req,
        ReactionTargetType.POST,
        'post-1',
      );

      expect(result).toEqual({ success: true, data: { message: 'Reaction removed' } });
    });
  });

  describe('getSummary', () => {
    it('should return reaction summary', async () => {
      const summary = {
        totalCount: 5,
        byType: { LIKE: 3, LOVE: 2 },
        topTypes: ['LIKE', 'LOVE'],
        userReaction: { type: 'LIKE' },
      };
      mockReactionService.getSummary.mockResolvedValue(summary);

      const result = await controller.getSummary(
        req,
        ReactionTargetType.POST,
        'post-1',
      );

      expect(result).toEqual({ success: true, data: summary });
    });
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const usersResult = {
        data: [{ userId: 'u1', displayName: 'User 1', avatarUrl: null, type: 'LIKE' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockReactionService.getUsers.mockResolvedValue(usersResult);

      const result = await controller.getUsers(
        ReactionTargetType.POST,
        'post-1',
        { page: 1, limit: 20 } as any,
      );

      expect(result).toEqual({ success: true, ...usersResult });
    });
  });
});

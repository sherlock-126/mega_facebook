import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BlockService } from './block.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BlockService', () => {
  let service: BlockService;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    userBlock: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    friendship: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BlockService>(BlockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('blockUser', () => {
    it('should throw BadRequestException for self-block', async () => {
      await expect(service.blockUser('user1', 'user1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.blockUser('user1', 'user2')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should block user and remove friendship in transaction', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user2' });
      const blockResult = {
        id: 'block1',
        blockerId: 'user1',
        blockedId: 'user2',
        createdAt: new Date(),
      };
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          friendship: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
          userBlock: { create: jest.fn().mockResolvedValue(blockResult) },
        };
        return fn(tx);
      });

      const result = await service.blockUser('user1', 'user2');
      expect(result).toEqual(blockResult);
    });

    it('should throw ConflictException on P2002 (already blocked)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user2' });
      mockPrisma.$transaction.mockRejectedValue({ code: 'P2002' });

      await expect(service.blockUser('user1', 'user2')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('unblockUser', () => {
    it('should throw NotFoundException if not blocked', async () => {
      mockPrisma.userBlock.findUnique.mockResolvedValue(null);
      await expect(service.unblockUser('user1', 'user2')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should unblock user successfully', async () => {
      mockPrisma.userBlock.findUnique.mockResolvedValue({
        id: 'block1',
        blockerId: 'user1',
        blockedId: 'user2',
      });
      mockPrisma.userBlock.delete.mockResolvedValue({});

      const result = await service.unblockUser('user1', 'user2');
      expect(result.message).toBe('User unblocked successfully');
      expect(mockPrisma.userBlock.delete).toHaveBeenCalledWith({
        where: { id: 'block1' },
      });
    });
  });

  describe('listBlockedUsers', () => {
    it('should return paginated blocked users', async () => {
      const blocks = [
        {
          blockedId: 'user2',
          createdAt: new Date('2026-01-01'),
          blocked: {
            profile: { displayName: 'User Two', avatarKey: null },
          },
        },
      ];
      mockPrisma.userBlock.findMany.mockResolvedValue(blocks);
      mockPrisma.userBlock.count.mockResolvedValue(1);

      const result = await service.listBlockedUsers('user1', 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe('user2');
      expect(result.data[0].displayName).toBe('User Two');
      expect(result.meta.total).toBe(1);
    });

    it('should return empty list when no blocks', async () => {
      mockPrisma.userBlock.findMany.mockResolvedValue([]);
      mockPrisma.userBlock.count.mockResolvedValue(0);

      const result = await service.listBlockedUsers('user1', 1, 20);
      expect(result.data).toHaveLength(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('getBlockStatus', () => {
    it('should return both false when no blocks', async () => {
      mockPrisma.userBlock.findUnique.mockResolvedValue(null);

      const result = await service.getBlockStatus('user1', 'user2');
      expect(result.isBlocked).toBe(false);
      expect(result.isBlockedBy).toBe(false);
    });

    it('should return isBlocked true when user blocked the other', async () => {
      mockPrisma.userBlock.findUnique
        .mockResolvedValueOnce({ id: 'block1' }) // sentBlock
        .mockResolvedValueOnce(null); // receivedBlock

      const result = await service.getBlockStatus('user1', 'user2');
      expect(result.isBlocked).toBe(true);
      expect(result.isBlockedBy).toBe(false);
    });

    it('should return isBlockedBy true when blocked by other', async () => {
      mockPrisma.userBlock.findUnique
        .mockResolvedValueOnce(null) // sentBlock
        .mockResolvedValueOnce({ id: 'block1' }); // receivedBlock

      const result = await service.getBlockStatus('user1', 'user2');
      expect(result.isBlocked).toBe(false);
      expect(result.isBlockedBy).toBe(true);
    });

    it('should return both true for mutual block', async () => {
      mockPrisma.userBlock.findUnique
        .mockResolvedValueOnce({ id: 'block1' }) // sentBlock
        .mockResolvedValueOnce({ id: 'block2' }); // receivedBlock

      const result = await service.getBlockStatus('user1', 'user2');
      expect(result.isBlocked).toBe(true);
      expect(result.isBlockedBy).toBe(true);
    });
  });

  describe('isBlocked', () => {
    it('should return false when no block exists', async () => {
      mockPrisma.userBlock.findFirst.mockResolvedValue(null);
      const result = await service.isBlocked('user1', 'user2');
      expect(result).toBe(false);
    });

    it('should return true when block exists', async () => {
      mockPrisma.userBlock.findFirst.mockResolvedValue({ id: 'block1' });
      const result = await service.isBlocked('user1', 'user2');
      expect(result).toBe(true);
    });
  });

  describe('getBlockedUserIds', () => {
    it('should return combined IDs of users blocked and blocked by', async () => {
      mockPrisma.userBlock.findMany.mockResolvedValue([
        { blockerId: 'user1', blockedId: 'user2' },
        { blockerId: 'user3', blockedId: 'user1' },
      ]);

      const result = await service.getBlockedUserIds('user1');
      expect(result).toContain('user2');
      expect(result).toContain('user3');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no blocks', async () => {
      mockPrisma.userBlock.findMany.mockResolvedValue([]);
      const result = await service.getBlockedUserIds('user1');
      expect(result).toHaveLength(0);
    });
  });
});

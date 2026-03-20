import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockService } from '../block/block.service';
import { FriendshipStatus } from '@prisma/client';

describe('FriendshipService', () => {
  let service: FriendshipService;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    friendship: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockBlockService = {
    isBlocked: jest.fn().mockResolvedValue(false),
    getBlockedUserIds: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendshipService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BlockService, useValue: mockBlockService },
      ],
    }).compile();

    service = module.get<FriendshipService>(FriendshipService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendRequest', () => {
    it('should throw BadRequestException for self-request', async () => {
      await expect(service.sendRequest('user1', 'user1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if addressee does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.sendRequest('user1', 'user2')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if already friends', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user2' });
      mockPrisma.friendship.findFirst.mockResolvedValue({
        id: 'f1',
        requesterId: 'user1',
        addresseeId: 'user2',
        status: FriendshipStatus.ACCEPTED,
      });
      await expect(service.sendRequest('user1', 'user2')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if pending request already sent', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user2' });
      mockPrisma.friendship.findFirst.mockResolvedValue({
        id: 'f1',
        requesterId: 'user1',
        addresseeId: 'user2',
        status: FriendshipStatus.PENDING,
      });
      await expect(service.sendRequest('user1', 'user2')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should auto-accept if reverse pending exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user2' });
      mockPrisma.friendship.findFirst.mockResolvedValue({
        id: 'f1',
        requesterId: 'user2',
        addresseeId: 'user1',
        status: FriendshipStatus.PENDING,
      });
      const updated = {
        id: 'f1',
        status: FriendshipStatus.ACCEPTED,
      };
      mockPrisma.friendship.update.mockResolvedValue(updated);
      const result = await service.sendRequest('user1', 'user2');
      expect(result).toEqual(updated);
      expect(mockPrisma.friendship.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { status: FriendshipStatus.ACCEPTED },
      });
    });

    it('should delete rejected and create fresh request on re-request', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user2' });
      mockPrisma.friendship.findFirst.mockResolvedValue({
        id: 'f1',
        requesterId: 'user1',
        addresseeId: 'user2',
        status: FriendshipStatus.REJECTED,
      });
      mockPrisma.friendship.delete.mockResolvedValue({});
      const created = {
        id: 'f2',
        requesterId: 'user1',
        addresseeId: 'user2',
        status: FriendshipStatus.PENDING,
      };
      mockPrisma.friendship.create.mockResolvedValue(created);
      const result = await service.sendRequest('user1', 'user2');
      expect(result).toEqual(created);
      expect(mockPrisma.friendship.delete).toHaveBeenCalledWith({ where: { id: 'f1' } });
    });

    it('should create a new pending friendship', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user2' });
      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      const created = {
        id: 'f1',
        requesterId: 'user1',
        addresseeId: 'user2',
        status: FriendshipStatus.PENDING,
      };
      mockPrisma.friendship.create.mockResolvedValue(created);
      const result = await service.sendRequest('user1', 'user2');
      expect(result).toEqual(created);
    });

    it('should handle P2002 unique constraint error gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user2' });
      mockPrisma.friendship.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'f1',
          status: FriendshipStatus.PENDING,
          requesterId: 'user1',
          addresseeId: 'user2',
        });
      mockPrisma.friendship.create.mockRejectedValue({ code: 'P2002' });
      await expect(service.sendRequest('user1', 'user2')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('acceptRequest', () => {
    it('should throw NotFoundException if request not found', async () => {
      mockPrisma.friendship.findUnique.mockResolvedValue(null);
      await expect(service.acceptRequest('f1', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not addressee', async () => {
      mockPrisma.friendship.findUnique.mockResolvedValue({
        id: 'f1',
        addresseeId: 'user2',
        status: FriendshipStatus.PENDING,
      });
      await expect(service.acceptRequest('f1', 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if not pending', async () => {
      mockPrisma.friendship.findUnique.mockResolvedValue({
        id: 'f1',
        addresseeId: 'user1',
        status: FriendshipStatus.ACCEPTED,
      });
      await expect(service.acceptRequest('f1', 'user1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should accept a pending request', async () => {
      mockPrisma.friendship.findUnique.mockResolvedValue({
        id: 'f1',
        addresseeId: 'user1',
        status: FriendshipStatus.PENDING,
      });
      const updated = { id: 'f1', status: FriendshipStatus.ACCEPTED };
      mockPrisma.friendship.update.mockResolvedValue(updated);
      const result = await service.acceptRequest('f1', 'user1');
      expect(result).toEqual(updated);
    });
  });

  describe('rejectRequest', () => {
    it('should throw NotFoundException if request not found', async () => {
      mockPrisma.friendship.findUnique.mockResolvedValue(null);
      await expect(service.rejectRequest('f1', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not addressee', async () => {
      mockPrisma.friendship.findUnique.mockResolvedValue({
        id: 'f1',
        addresseeId: 'user2',
        status: FriendshipStatus.PENDING,
      });
      await expect(service.rejectRequest('f1', 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if not pending', async () => {
      mockPrisma.friendship.findUnique.mockResolvedValue({
        id: 'f1',
        addresseeId: 'user1',
        status: FriendshipStatus.ACCEPTED,
      });
      await expect(service.rejectRequest('f1', 'user1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject a pending request', async () => {
      mockPrisma.friendship.findUnique.mockResolvedValue({
        id: 'f1',
        addresseeId: 'user1',
        status: FriendshipStatus.PENDING,
      });
      const updated = { id: 'f1', status: FriendshipStatus.REJECTED };
      mockPrisma.friendship.update.mockResolvedValue(updated);
      const result = await service.rejectRequest('f1', 'user1');
      expect(result).toEqual(updated);
    });
  });

  describe('unfriend', () => {
    it('should throw NotFoundException if friendship not found', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      await expect(service.unfriend('user1', 'user2')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete friendship', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue({ id: 'f1' });
      mockPrisma.friendship.delete.mockResolvedValue({});
      const result = await service.unfriend('user1', 'user2');
      expect(result.message).toBe('Unfriended successfully');
    });
  });

  describe('listFriends', () => {
    it('should return paginated friends list', async () => {
      const friendships = [
        {
          requesterId: 'user1',
          addresseeId: 'user2',
          updatedAt: new Date(),
          requester: { id: 'user1', profile: { displayName: 'User 1', avatarKey: null } },
          addressee: { id: 'user2', profile: { displayName: 'User 2', avatarKey: null } },
        },
      ];
      mockPrisma.friendship.findMany.mockResolvedValue(friendships);
      mockPrisma.friendship.count.mockResolvedValue(1);

      const result = await service.listFriends('user1', 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe('user2');
      expect(result.meta.total).toBe(1);
    });

    it('should return empty data for no friends', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([]);
      mockPrisma.friendship.count.mockResolvedValue(0);

      const result = await service.listFriends('user1', 1, 20);
      expect(result.data).toHaveLength(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('listIncomingRequests', () => {
    it('should return incoming requests with requester info', async () => {
      const requests = [
        {
          id: 'f1',
          createdAt: new Date(),
          requester: { id: 'user2', profile: { displayName: 'User 2', avatarKey: null } },
        },
      ];
      mockPrisma.friendship.findMany.mockResolvedValue(requests);
      mockPrisma.friendship.count.mockResolvedValue(1);

      const result = await service.listIncomingRequests('user1', 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].requester.userId).toBe('user2');
    });
  });

  describe('listOutgoingRequests', () => {
    it('should return outgoing requests with addressee info', async () => {
      const requests = [
        {
          id: 'f1',
          createdAt: new Date(),
          addressee: { id: 'user2', profile: { displayName: 'User 2', avatarKey: null } },
        },
      ];
      mockPrisma.friendship.findMany.mockResolvedValue(requests);
      mockPrisma.friendship.count.mockResolvedValue(1);

      const result = await service.listOutgoingRequests('user1', 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].addressee.userId).toBe('user2');
    });
  });

  describe('getStatus', () => {
    it('should return NONE when no friendship exists', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      const result = await service.getStatus('user1', 'user2');
      expect(result.status).toBe('NONE');
    });

    it('should return FRIENDS when accepted', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue({
        id: 'f1',
        requesterId: 'user1',
        addresseeId: 'user2',
        status: FriendshipStatus.ACCEPTED,
      });
      const result = await service.getStatus('user1', 'user2');
      expect(result.status).toBe('FRIENDS');
      expect(result.friendshipId).toBe('f1');
    });

    it('should return PENDING_SENT when user sent request', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue({
        id: 'f1',
        requesterId: 'user1',
        addresseeId: 'user2',
        status: FriendshipStatus.PENDING,
      });
      const result = await service.getStatus('user1', 'user2');
      expect(result.status).toBe('PENDING_SENT');
    });

    it('should return PENDING_RECEIVED when user received request', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue({
        id: 'f1',
        requesterId: 'user2',
        addresseeId: 'user1',
        status: FriendshipStatus.PENDING,
      });
      const result = await service.getStatus('user1', 'user2');
      expect(result.status).toBe('PENDING_RECEIVED');
    });

    it('should return NONE for rejected status', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue({
        id: 'f1',
        requesterId: 'user1',
        addresseeId: 'user2',
        status: FriendshipStatus.REJECTED,
      });
      const result = await service.getStatus('user1', 'user2');
      expect(result.status).toBe('NONE');
    });
  });
});

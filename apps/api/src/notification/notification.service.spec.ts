import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { MediaService } from '../media/media.service';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  } as any;

  const mockWsGateway = { emitToUser: jest.fn() };
  const mockMediaService = { getSignedUrl: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebsocketGateway, useValue: mockWsGateway },
        { provide: MediaService, useValue: mockMediaService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should skip self-notification', async () => {
      const result = await service.createNotification({
        userId: 'user-1',
        actorId: 'user-1',
        type: 'COMMENT',
        content: 'test',
      });

      expect(result).toBeNull();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should create notification and emit WS events', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        actorId: 'user-2',
        type: 'COMMENT',
        targetId: 'post-1',
        content: 'commented on your post',
        isRead: false,
        createdAt: new Date(),
        actor: {
          profile: { displayName: 'User 2', avatarKey: null },
        },
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      mockPrisma.notification.count.mockResolvedValue(3);

      const result = await service.createNotification({
        userId: 'user-1',
        actorId: 'user-2',
        type: 'COMMENT',
        targetId: 'post-1',
        content: 'commented on your post',
      });

      expect(result).toBeDefined();
      expect(result!.id).toBe('notif-1');
      expect(result!.type).toBe('COMMENT');
      expect(mockWsGateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        'notification:new',
        expect.objectContaining({ notification: expect.any(Object) }),
      );
      expect(mockWsGateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        'notification:unread_count',
        { count: 3 },
      );
    });

    it('should sign avatar URL when avatarKey exists', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        actorId: 'user-2',
        type: 'FRIEND_REQUEST',
        targetId: null,
        content: 'sent you a friend request',
        isRead: false,
        createdAt: new Date(),
        actor: {
          profile: { displayName: 'User 2', avatarKey: 'avatars/user-2.jpg' },
        },
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      mockPrisma.notification.count.mockResolvedValue(1);
      mockMediaService.getSignedUrl.mockResolvedValue('https://signed-url.com/avatar.jpg');

      const result = await service.createNotification({
        userId: 'user-1',
        actorId: 'user-2',
        type: 'FRIEND_REQUEST',
        content: 'sent you a friend request',
      });

      expect(result!.actor.avatarUrl).toBe('https://signed-url.com/avatar.jpg');
      expect(mockMediaService.getSignedUrl).toHaveBeenCalledWith('avatars/user-2.jpg');
    });
  });

  describe('listNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          actorId: 'user-2',
          type: 'COMMENT',
          targetId: 'post-1',
          content: 'commented on your post',
          isRead: false,
          createdAt: new Date(),
          actor: { profile: { displayName: 'User 2', avatarKey: null } },
        },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.listNotifications('user-1', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should return empty list when no notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      const result = await service.listNotifications('user-1');

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should filter by type', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.listNotifications('user-1', 1, 20, {
        type: ['COMMENT', 'COMMENT_REPLY'],
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            type: { in: ['COMMENT', 'COMMENT_REPLY'] },
          },
        }),
      );
    });

    it('should filter by isRead', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.listNotifications('user-1', 1, 20, { isRead: false });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            isRead: false,
          },
        }),
      );
    });

    it('should filter by both type and isRead', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.listNotifications('user-1', 1, 20, {
        type: ['REACTION'],
        isRead: true,
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            type: { in: ['REACTION'] },
            isRead: true,
          },
        }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        isRead: false,
      });
      mockPrisma.notification.update.mockResolvedValue({ id: 'notif-1', isRead: true });
      mockPrisma.notification.count.mockResolvedValue(2);

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result).toEqual({ isRead: true });
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true },
      });
      expect(mockWsGateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        'notification:unread_count',
        { count: 2 },
      );
    });

    it('should throw NotFoundException for non-existent notification', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('notif-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for wrong user', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-2',
        isRead: false,
      });

      await expect(service.markAsRead('notif-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ updatedCount: 3 });
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
      expect(mockWsGateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        'notification:unread_count',
        { count: 0 },
      );
    });

    it('should handle no unread notifications', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ updatedCount: 0 });
    });
  });
});

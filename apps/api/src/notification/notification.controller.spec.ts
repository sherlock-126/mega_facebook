import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;

  const mockNotificationService = {
    listNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  };

  const mockUser = { user: { userId: 'user-1' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listNotifications', () => {
    it('should list notifications', async () => {
      const result = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      mockNotificationService.listNotifications.mockResolvedValue(result);

      const response = await controller.listNotifications(mockUser as any, { page: 1, limit: 20 } as any);
      expect(response).toEqual({ success: true, ...result });
    });

    it('should pass type filter to service', async () => {
      const result = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      mockNotificationService.listNotifications.mockResolvedValue(result);

      await controller.listNotifications(mockUser as any, {
        page: 1,
        limit: 20,
        type: 'COMMENT,REACTION',
      } as any);

      expect(mockNotificationService.listNotifications).toHaveBeenCalledWith(
        'user-1',
        1,
        20,
        { type: ['COMMENT', 'REACTION'] },
      );
    });

    it('should pass isRead filter to service', async () => {
      const result = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      mockNotificationService.listNotifications.mockResolvedValue(result);

      await controller.listNotifications(mockUser as any, {
        page: 1,
        limit: 20,
        isRead: 'false',
      } as any);

      expect(mockNotificationService.listNotifications).toHaveBeenCalledWith(
        'user-1',
        1,
        20,
        { isRead: false },
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockNotificationService.getUnreadCount.mockResolvedValue(5);

      const response = await controller.getUnreadCount(mockUser as any);
      expect(response).toEqual({ success: true, data: { count: 5 } });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockNotificationService.markAsRead.mockResolvedValue({ isRead: true });

      const response = await controller.markAsRead(mockUser as any, 'notif-1');
      expect(response).toEqual({ success: true, data: { isRead: true } });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue({ updatedCount: 3 });

      const response = await controller.markAllAsRead(mockUser as any);
      expect(response).toEqual({ success: true, data: { updatedCount: 3 } });
    });
  });
});

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { MediaService } from '../media/media.service';
import { DEFAULT_NOTIFICATION_LIMIT } from './constants/notification.constants';

interface CreateNotificationInput {
  userId: string;
  actorId: string;
  type: string;
  targetId?: string;
  content: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: WebsocketGateway,
    private readonly mediaService: MediaService,
  ) {}

  async createNotification(input: CreateNotificationInput) {
    // Skip self-notifications
    if (input.actorId === input.userId) {
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        actorId: input.actorId,
        type: input.type as any,
        targetId: input.targetId,
        content: input.content.substring(0, 500),
      },
      include: {
        actor: { include: { profile: true } },
      },
    });

    const formatted = await this.formatNotificationResponse(notification);

    // Push real-time notification
    this.wsGateway.emitToUser(input.userId, 'notification:new', {
      notification: formatted,
    });

    // Push updated unread count
    const count = await this.getUnreadCount(input.userId);
    this.wsGateway.emitToUser(input.userId, 'notification:unread_count', { count });

    return formatted;
  }

  async listNotifications(
    userId: string,
    page: number = 1,
    limit: number = DEFAULT_NOTIFICATION_LIMIT,
    filters?: { type?: string[]; isRead?: boolean },
  ) {
    const skip = (page - 1) * limit;
    const where: any = { userId };

    if (filters?.type && filters.type.length > 0) {
      where.type = { in: filters.type };
    }

    if (filters?.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          actor: { include: { profile: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    const data = await Promise.all(
      notifications.map((n) => this.formatNotificationResponse(n)),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Not your notification');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    // Push updated unread count
    const count = await this.getUnreadCount(userId);
    this.wsGateway.emitToUser(userId, 'notification:unread_count', { count });

    return { isRead: true };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    // Push updated unread count
    this.wsGateway.emitToUser(userId, 'notification:unread_count', { count: 0 });

    return { updatedCount: result.count };
  }

  private async formatNotificationResponse(notification: any) {
    const avatarUrl = notification.actor?.profile?.avatarKey
      ? await this.mediaService.getSignedUrl(notification.actor.profile.avatarKey)
      : null;

    return {
      id: notification.id,
      type: notification.type,
      actorId: notification.actorId,
      actor: {
        displayName: notification.actor?.profile?.displayName ?? null,
        avatarUrl,
      },
      targetId: notification.targetId,
      content: notification.content,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  }
}

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { NotificationService } from '../notification/notification.service';
import { MediaService } from '../media/media.service';
import { BlockService } from '../block/block.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { DEFAULT_MESSAGE_LIMIT, DEFAULT_CONVERSATION_LIMIT } from './constants/message.constants';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: WebsocketGateway,
    private readonly notificationService: NotificationService,
    private readonly mediaService: MediaService,
    private readonly blockService: BlockService,
  ) {}

  async createOrGetConversation(userId: string, dto: CreateConversationDto): Promise<{
    id: string;
    participant: { userId: string; displayName: string | null; avatarUrl: string | null };
    createdAt: Date;
    updatedAt: Date;
  }> {
    if (dto.participantId === userId) {
      throw new BadRequestException('Cannot create conversation with yourself');
    }

    // Check block status
    const blocked = await this.blockService.isBlocked(userId, dto.participantId);
    if (blocked) {
      throw new ForbiddenException('Cannot message this user');
    }

    // Validate participant exists and is ACTIVE
    const participant = await this.prisma.user.findFirst({
      where: { id: dto.participantId, status: 'ACTIVE' },
      include: { profile: true },
    });
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    // Check for existing conversation
    const existing = await this.prisma.conversationParticipant.findMany({
      where: {
        userId: { in: [userId, dto.participantId] },
      },
      select: { conversationId: true, userId: true },
    });

    // Group by conversationId to find shared conversation
    const convMap = new Map<string, string[]>();
    for (const cp of existing) {
      if (!convMap.has(cp.conversationId)) {
        convMap.set(cp.conversationId, []);
      }
      convMap.get(cp.conversationId)!.push(cp.userId);
    }

    for (const [convId, users] of convMap) {
      if (users.includes(userId) && users.includes(dto.participantId)) {
        const conversation = await this.getConversationById(convId, userId);
        return conversation;
      }
    }

    // Create new conversation in a transaction
    try {
      const conversation = await this.prisma.$transaction(async (tx) => {
        const conv = await tx.conversation.create({ data: {} });
        await tx.conversationParticipant.createMany({
          data: [
            { conversationId: conv.id, userId },
            { conversationId: conv.id, userId: dto.participantId },
          ],
        });
        return conv;
      });

      return this.getConversationById(conversation.id, userId);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        // Race condition: conversation was created by another request
        // Retry finding the existing conversation
        return this.createOrGetConversation(userId, dto);
      }
      throw error;
    }
  }

  async listConversations(userId: string, page: number = 1, limit: number = DEFAULT_CONVERSATION_LIMIT) {
    const skip = (page - 1) * limit;

    const participantEntries = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    const conversationIds = participantEntries.map((p) => p.conversationId);

    if (conversationIds.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    const total = conversationIds.length;

    const conversations = await this.prisma.conversation.findMany({
      where: { id: { in: conversationIds } },
      include: {
        participants: {
          include: {
            user: { include: { profile: true } },
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    });

    const data = await Promise.all(
      conversations.map(async (conv) => {
        const otherParticipant = conv.participants.find((p) => p.userId !== userId);
        const myParticipant = conv.participants.find((p) => p.userId === userId);
        const lastMessage = conv.messages[0] || null;

        // Count unread messages
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            deletedAt: null,
            createdAt: myParticipant?.lastReadAt
              ? { gt: myParticipant.lastReadAt }
              : undefined,
          },
        });

        const avatarUrl = otherParticipant?.user?.profile?.avatarKey
          ? await this.mediaService.getSignedUrl(otherParticipant.user.profile.avatarKey)
          : null;

        return {
          id: conv.id,
          participant: {
            userId: otherParticipant?.userId ?? '',
            displayName: otherParticipant?.user?.profile?.displayName ?? null,
            avatarUrl,
          },
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                senderId: lastMessage.senderId,
              }
            : null,
          unreadCount,
          updatedAt: conv.updatedAt,
        };
      }),
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

  async getMessages(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit: number = DEFAULT_MESSAGE_LIMIT,
  ) {
    await this.validateParticipant(conversationId, userId);

    const where: any = {
      conversationId,
      deletedAt: null,
    };

    if (cursor) {
      const cursorMessage = await this.prisma.message.findUnique({
        where: { id: cursor },
      });
      if (cursorMessage) {
        where.createdAt = { lt: cursorMessage.createdAt };
      }
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: {
        sender: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const data = messages.slice(0, limit);

    const formattedMessages = await Promise.all(
      data.map(async (msg) => this.formatMessageResponse(msg)),
    );

    return {
      data: formattedMessages,
      meta: {
        hasMore,
        nextCursor: hasMore ? data[data.length - 1].id : null,
      },
    };
  }

  async sendMessage(conversationId: string, userId: string, dto: SendMessageDto) {
    const participant = await this.validateParticipant(conversationId, userId);

    // Check if blocked by other participant(s) in conversation
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId } },
    });
    for (const p of participants) {
      const blocked = await this.blockService.isBlocked(userId, p.userId);
      if (blocked) {
        throw new ForbiddenException('Cannot send message to this conversation');
      }
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          content: dto.content,
        },
        include: {
          sender: { include: { profile: true } },
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return msg;
    });

    const formattedMessage = await this.formatMessageResponse(message);

    // Get all participants to emit WS events
    const allParticipants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
    });

    for (const p of allParticipants) {
      this.wsGateway.emitToUser(p.userId, 'message:new', {
        message: formattedMessage,
        conversationId,
      });
    }

    // Create notification for the other participant(s)
    for (const p of allParticipants) {
      if (p.userId !== userId) {
        await this.notificationService.createNotification({
          userId: p.userId,
          actorId: userId,
          type: 'NEW_MESSAGE',
          targetId: conversationId,
          content: dto.content.substring(0, 100),
        });
      }
    }

    return formattedMessage;
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.validateParticipant(conversationId, userId);

    const readAt = new Date();
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: readAt },
    });

    // Emit read receipt to all participants
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
    });

    for (const participant of participants) {
      this.wsGateway.emitToUser(participant.userId, 'message:read_receipt', {
        conversationId,
        userId,
        readAt,
      });
    }

    return { readAt };
  }

  private async validateParticipant(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });
    if (!participant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    return participant;
  }

  private async getConversationById(conversationId: string, userId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    if (!conv) throw new NotFoundException('Conversation not found');

    const otherParticipant = conv.participants.find((p) => p.userId !== userId);
    const avatarUrl = otherParticipant?.user?.profile?.avatarKey
      ? await this.mediaService.getSignedUrl(otherParticipant.user.profile.avatarKey)
      : null;

    return {
      id: conv.id,
      participant: {
        userId: otherParticipant?.userId ?? '',
        displayName: otherParticipant?.user?.profile?.displayName ?? null,
        avatarUrl,
      },
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  }

  private async formatMessageResponse(message: any) {
    const avatarUrl = message.sender?.profile?.avatarKey
      ? await this.mediaService.getSignedUrl(message.sender.profile.avatarKey)
      : null;

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      sender: {
        displayName: message.sender?.profile?.displayName ?? null,
        avatarUrl,
      },
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}

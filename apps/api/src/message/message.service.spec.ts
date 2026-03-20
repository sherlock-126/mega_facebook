import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MessageService } from './message.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { NotificationService } from '../notification/notification.service';
import { MediaService } from '../media/media.service';
import { BlockService } from '../block/block.service';

describe('MessageService', () => {
  let service: MessageService;

  const mockPrisma = {
    user: { findFirst: jest.fn() },
    conversation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    conversationParticipant: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
    },
    message: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  const mockWsGateway = { emitToUser: jest.fn() };
  const mockNotificationService = { createNotification: jest.fn() };
  const mockMediaService = { getSignedUrl: jest.fn() };
  const mockBlockService = {
    isBlocked: jest.fn().mockResolvedValue(false),
    getBlockedUserIds: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebsocketGateway, useValue: mockWsGateway },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: MediaService, useValue: mockMediaService },
        { provide: BlockService, useValue: mockBlockService },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrGetConversation', () => {
    it('should throw BadRequestException for self-conversation', async () => {
      await expect(
        service.createOrGetConversation('user-1', { participantId: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent participant', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.createOrGetConversation('user-1', { participantId: 'user-2' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return existing conversation', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-2', status: 'ACTIVE', profile: {} });
      mockPrisma.conversationParticipant.findMany.mockResolvedValue([
        { conversationId: 'conv-1', userId: 'user-1' },
        { conversationId: 'conv-1', userId: 'user-2' },
      ]);
      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        participants: [
          { userId: 'user-1', user: { profile: {} } },
          { userId: 'user-2', user: { profile: { displayName: 'User 2' } } },
        ],
      });

      const result = await service.createOrGetConversation('user-1', { participantId: 'user-2' });
      expect(result.id).toBe('conv-1');
    });

    it('should create new conversation when none exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-2', status: 'ACTIVE', profile: {} });
      mockPrisma.conversationParticipant.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          conversation: { create: jest.fn().mockResolvedValue({ id: 'new-conv' }) },
          conversationParticipant: { createMany: jest.fn() },
        });
      });
      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 'new-conv',
        participants: [
          { userId: 'user-1', user: { profile: {} } },
          { userId: 'user-2', user: { profile: { displayName: 'User 2' } } },
        ],
      });

      const result = await service.createOrGetConversation('user-1', { participantId: 'user-2' });
      expect(result.id).toBe('new-conv');
    });
  });

  describe('getMessages', () => {
    it('should throw ForbiddenException if not a participant', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1' });
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue(null);

      await expect(
        service.getMessages('conv-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent conversation', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.getMessages('conv-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return messages with cursor pagination', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1' });
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({ userId: 'user-1' });
      mockPrisma.message.findMany.mockResolvedValue([
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Hello',
          createdAt: new Date(),
          updatedAt: new Date(),
          sender: { profile: {} },
        },
      ]);

      const result = await service.getMessages('conv-1', 'user-1');
      expect(result.data).toHaveLength(1);
      expect(result.meta.hasMore).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should send message and emit WS events', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1' });
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({ userId: 'user-1' });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          message: {
            create: jest.fn().mockResolvedValue({
              id: 'msg-1',
              conversationId: 'conv-1',
              senderId: 'user-1',
              content: 'Hello',
              createdAt: new Date(),
              updatedAt: new Date(),
              sender: { profile: {} },
            }),
          },
          conversation: { update: jest.fn() },
        });
      });
      mockPrisma.conversationParticipant.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);

      const result = await service.sendMessage('conv-1', 'user-1', { content: 'Hello' });
      expect(result.content).toBe('Hello');
      expect(mockWsGateway.emitToUser).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should mark conversation as read and emit read receipt', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1' });
      mockPrisma.conversationParticipant.findFirst.mockResolvedValue({ userId: 'user-1' });
      mockPrisma.conversationParticipant.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.conversationParticipant.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);

      const result = await service.markAsRead('conv-1', 'user-1');
      expect(result.readAt).toBeDefined();
      expect(mockWsGateway.emitToUser).toHaveBeenCalled();
    });
  });

  describe('listConversations', () => {
    it('should return empty list when user has no conversations', async () => {
      mockPrisma.conversationParticipant.findMany.mockResolvedValue([]);

      const result = await service.listConversations('user-1');
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });
});

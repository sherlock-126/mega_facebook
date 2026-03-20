import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { MessageGateway } from './message.gateway';
import { MessageService } from './message.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { PrismaService } from '../prisma/prisma.service';

describe('MessageGateway', () => {
  let gateway: MessageGateway;

  const mockMessageService = {
    sendMessage: jest.fn(),
    markAsRead: jest.fn(),
  };
  const mockWsGateway = { emitToUser: jest.fn() };
  const mockPrisma = {
    conversationParticipant: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageGateway,
        { provide: MessageService, useValue: mockMessageService },
        { provide: WebsocketGateway, useValue: mockWsGateway },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    gateway = module.get<MessageGateway>(MessageGateway);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleSendMessage', () => {
    it('should send a message via WS', async () => {
      const mockClient = { userId: 'user-1' } as any;
      mockMessageService.sendMessage.mockResolvedValue({ id: 'msg-1', content: 'Hello' });

      const result = await gateway.handleSendMessage(mockClient, {
        conversationId: 'conv-1',
        content: 'Hello',
      });

      expect(result.data.content).toBe('Hello');
    });

    it('should throw WsException for empty content', async () => {
      const mockClient = { userId: 'user-1' } as any;

      await expect(
        gateway.handleSendMessage(mockClient, {
          conversationId: 'conv-1',
          content: '',
        }),
      ).rejects.toThrow(WsException);
    });
  });

  describe('handleTyping', () => {
    it('should emit typing event to other participants', async () => {
      const mockClient = { userId: 'user-1' } as any;
      mockPrisma.conversationParticipant.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);

      await gateway.handleTyping(mockClient, { conversationId: 'conv-1' });

      expect(mockWsGateway.emitToUser).toHaveBeenCalledWith(
        'user-2',
        'message:typing',
        { conversationId: 'conv-1', userId: 'user-1' },
      );
    });
  });
});

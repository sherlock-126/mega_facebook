import { Test, TestingModule } from '@nestjs/testing';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';

describe('MessageController', () => {
  let controller: MessageController;
  let service: MessageService;

  const mockMessageService = {
    createOrGetConversation: jest.fn(),
    listConversations: jest.fn(),
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    markAsRead: jest.fn(),
  };

  const mockUser = { user: { userId: 'user-1' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageController],
      providers: [
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).compile();

    controller = module.get<MessageController>(MessageController);
    service = module.get<MessageService>(MessageService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createConversation', () => {
    it('should create or get conversation', async () => {
      const result = { id: 'conv-1', participant: {} };
      mockMessageService.createOrGetConversation.mockResolvedValue(result);

      const response = await controller.createConversation(mockUser as any, {
        participantId: 'user-2',
      });

      expect(response).toEqual({ success: true, data: result });
      expect(mockMessageService.createOrGetConversation).toHaveBeenCalledWith(
        'user-1',
        { participantId: 'user-2' },
      );
    });
  });

  describe('listConversations', () => {
    it('should list conversations', async () => {
      const result = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      mockMessageService.listConversations.mockResolvedValue(result);

      const response = await controller.listConversations(mockUser as any, { page: 1, limit: 20 } as any);

      expect(response).toEqual({ success: true, ...result });
    });
  });

  describe('getMessages', () => {
    it('should get messages with cursor pagination', async () => {
      const result = { data: [], meta: { hasMore: false, nextCursor: null } };
      mockMessageService.getMessages.mockResolvedValue(result);

      const response = await controller.getMessages(
        mockUser as any,
        'conv-1',
        { limit: 50 } as any,
      );

      expect(response).toEqual({ success: true, ...result });
    });
  });

  describe('sendMessage', () => {
    it('should send a message', async () => {
      const result = { id: 'msg-1', content: 'Hello' };
      mockMessageService.sendMessage.mockResolvedValue(result);

      const response = await controller.sendMessage(
        mockUser as any,
        'conv-1',
        { content: 'Hello' },
      );

      expect(response).toEqual({ success: true, data: result });
    });
  });

  describe('markAsRead', () => {
    it('should mark conversation as read', async () => {
      const result = { readAt: new Date() };
      mockMessageService.markAsRead.mockResolvedValue(result);

      const response = await controller.markAsRead(mockUser as any, 'conv-1');

      expect(response).toEqual({ success: true, data: result });
    });
  });
});

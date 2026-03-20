import { Test, TestingModule } from '@nestjs/testing';
import { PresenceGateway } from './presence.gateway';
import { PresenceService } from './presence.service';
import { BlockService } from '../block/block.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

describe('PresenceGateway', () => {
  let gateway: PresenceGateway;

  const mockPresenceService = {
    handleUserConnected: jest.fn(),
    handleUserDisconnected: jest.fn(),
    getPresence: jest.fn(),
  };

  const mockBlockService = {
    isBlocked: jest.fn(),
  };

  const mockWebsocketGateway = {
    emitToUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceGateway,
        { provide: PresenceService, useValue: mockPresenceService },
        { provide: BlockService, useValue: mockBlockService },
        { provide: WebsocketGateway, useValue: mockWebsocketGateway },
      ],
    }).compile();

    gateway = module.get<PresenceGateway>(PresenceGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleUserConnected', () => {
    it('should delegate to presence service', async () => {
      await gateway.handleUserConnected({ userId: 'user-1' });

      expect(mockPresenceService.handleUserConnected).toHaveBeenCalledWith('user-1');
    });
  });

  describe('handleUserDisconnected', () => {
    it('should delegate to presence service', async () => {
      await gateway.handleUserDisconnected({ userId: 'user-1' });

      expect(mockPresenceService.handleUserDisconnected).toHaveBeenCalledWith('user-1');
    });
  });

  describe('handlePresenceSubscribe', () => {
    it('should send current presence to subscriber', async () => {
      mockBlockService.isBlocked.mockResolvedValue(false);
      mockPresenceService.getPresence.mockResolvedValue({
        userId: 'target-1',
        status: 'online',
        lastSeenAt: null,
      });

      const client = { userId: 'subscriber-1' } as any;
      await gateway.handlePresenceSubscribe(client, { userId: 'target-1' });

      expect(mockWebsocketGateway.emitToUser).toHaveBeenCalledWith(
        'subscriber-1',
        'presence:update',
        { userId: 'target-1', status: 'online', lastSeenAt: null },
      );
    });

    it('should silently ignore blocked users', async () => {
      mockBlockService.isBlocked.mockResolvedValue(true);

      const client = { userId: 'subscriber-1' } as any;
      await gateway.handlePresenceSubscribe(client, { userId: 'blocked-user' });

      expect(mockPresenceService.getPresence).not.toHaveBeenCalled();
      expect(mockWebsocketGateway.emitToUser).not.toHaveBeenCalled();
    });

    it('should handle missing userId gracefully', async () => {
      const client = { userId: undefined } as any;
      await gateway.handlePresenceSubscribe(client, { userId: 'target-1' });

      expect(mockBlockService.isBlocked).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up subscriptions on disconnect', () => {
      const client = { userId: 'user-1' } as any;
      gateway.handleDisconnect(client);
      // Should not throw
    });
  });
});

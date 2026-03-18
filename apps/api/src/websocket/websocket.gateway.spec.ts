import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { WebsocketGateway } from './websocket.gateway';
import { RedisService } from '../redis/redis.service';

describe('WebsocketGateway', () => {
  let gateway: WebsocketGateway;

  const mockJwtService = { verify: jest.fn() };
  const mockRedisService = { isJtiBlacklisted: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    gateway = module.get<WebsocketGateway>(WebsocketGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should add client to user room and track socket', () => {
      const mockClient = {
        userId: 'user-1',
        id: 'socket-1',
        join: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(mockClient);
      expect(mockClient.join).toHaveBeenCalledWith('user:user-1');
      expect(gateway.isUserOnline('user-1')).toBe(true);
    });

    it('should disconnect client without userId', () => {
      const mockClient = {
        userId: undefined,
        id: 'socket-1',
        join: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(mockClient);
      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove client from tracking', () => {
      const mockClient = {
        userId: 'user-1',
        id: 'socket-1',
        join: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      gateway.handleConnection(mockClient);
      gateway.handleDisconnect(mockClient);
      expect(gateway.isUserOnline('user-1')).toBe(false);
    });
  });

  describe('emitToUser', () => {
    it('should emit event to user room', () => {
      const mockEmit = jest.fn();
      gateway.server = { to: jest.fn().mockReturnValue({ emit: mockEmit }) } as any;

      gateway.emitToUser('user-1', 'test:event', { data: 'test' });
      expect(gateway.server.to).toHaveBeenCalledWith('user:user-1');
      expect(mockEmit).toHaveBeenCalledWith('test:event', { data: 'test' });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { PresenceService } from './presence.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { FriendshipService } from '../friendship/friendship.service';
import { BlockService } from '../block/block.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

describe('PresenceService', () => {
  let service: PresenceService;

  const mockRedis = {
    incr: jest.fn(),
    decr: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
  };

  const mockFriendshipService = {
    getFriendIds: jest.fn(),
  };

  const mockBlockService = {
    isBlocked: jest.fn(),
    getBlockedUserIds: jest.fn(),
  };

  const mockWebsocketGateway = {
    emitToUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: FriendshipService, useValue: mockFriendshipService },
        { provide: BlockService, useValue: mockBlockService },
        { provide: WebsocketGateway, useValue: mockWebsocketGateway },
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleUserConnected', () => {
    it('should increment counter and set online state on first connection', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.set.mockResolvedValue('OK');
      mockFriendshipService.getFriendIds.mockResolvedValue(['friend-1']);
      mockBlockService.getBlockedUserIds.mockResolvedValue([]);

      await service.handleUserConnected('user-1');

      expect(mockRedis.incr).toHaveBeenCalledWith('presence:user-1:count');
      expect(mockRedis.expire).toHaveBeenCalledWith('presence:user-1:count', 300);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'presence:user-1',
        JSON.stringify({ status: 'online', lastSeenAt: null }),
      );
      expect(mockWebsocketGateway.emitToUser).toHaveBeenCalledWith(
        'friend-1',
        'presence:update',
        expect.objectContaining({ userId: 'user-1', status: 'online' }),
      );
    });

    it('should not broadcast on subsequent connections', async () => {
      mockRedis.incr.mockResolvedValue(2);

      await service.handleUserConnected('user-1');

      expect(mockRedis.set).not.toHaveBeenCalledWith(
        'presence:user-1',
        expect.any(String),
      );
      expect(mockWebsocketGateway.emitToUser).not.toHaveBeenCalled();
    });

    it('should filter blocked users from broadcast', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.set.mockResolvedValue('OK');
      mockFriendshipService.getFriendIds.mockResolvedValue(['friend-1', 'blocked-1']);
      mockBlockService.getBlockedUserIds.mockResolvedValue(['blocked-1']);

      await service.handleUserConnected('user-1');

      expect(mockWebsocketGateway.emitToUser).toHaveBeenCalledTimes(1);
      expect(mockWebsocketGateway.emitToUser).toHaveBeenCalledWith(
        'friend-1',
        'presence:update',
        expect.any(Object),
      );
    });
  });

  describe('handleUserDisconnected', () => {
    it('should decrement counter and schedule offline when last socket disconnects', async () => {
      mockRedis.decr.mockResolvedValue(0);
      mockRedis.del.mockResolvedValue(1);
      mockRedis.set.mockResolvedValue('OK');

      await service.handleUserDisconnected('user-1');

      expect(mockRedis.decr).toHaveBeenCalledWith('presence:user-1:count');
      expect(mockRedis.del).toHaveBeenCalledWith('presence:user-1:count');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'presence:user-1:pending_offline',
        '1',
        'EX',
        3,
      );
    });

    it('should refresh TTL when other sockets remain', async () => {
      mockRedis.decr.mockResolvedValue(1);

      await service.handleUserDisconnected('user-1');

      expect(mockRedis.expire).toHaveBeenCalledWith('presence:user-1:count', 300);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('getPresence', () => {
    it('should return presence data from Redis', async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({ status: 'online', lastSeenAt: null }),
      );

      const result = await service.getPresence('user-1');

      expect(result).toEqual({
        userId: 'user-1',
        status: 'online',
        lastSeenAt: null,
      });
    });

    it('should return offline when no data in Redis', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getPresence('user-1');

      expect(result).toEqual({
        userId: 'user-1',
        status: 'offline',
        lastSeenAt: null,
      });
    });

    it('should mask presence for blocked users', async () => {
      mockBlockService.isBlocked.mockResolvedValue(true);
      mockRedis.get.mockResolvedValue(
        JSON.stringify({ status: 'online', lastSeenAt: null }),
      );

      const result = await service.getPresence('user-1', 'blocked-requester');

      expect(result).toEqual({
        userId: 'user-1',
        status: 'offline',
        lastSeenAt: null,
      });
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('should return unknown on Redis error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis down'));

      const result = await service.getPresence('user-1');

      expect(result).toEqual({
        userId: 'user-1',
        status: 'unknown',
        lastSeenAt: null,
      });
    });
  });

  describe('getBatchPresence', () => {
    it('should return presence for multiple users excluding blocked', async () => {
      mockBlockService.getBlockedUserIds.mockResolvedValue(['blocked-1']);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify({ status: 'online', lastSeenAt: null }))
        .mockResolvedValueOnce(JSON.stringify({ status: 'offline', lastSeenAt: '2026-01-01T00:00:00Z' }));

      const result = await service.getBatchPresence(
        ['user-1', 'user-2', 'blocked-1'],
        'requester',
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userId: 'user-1',
        status: 'online',
        lastSeenAt: null,
      });
      expect(result[1]).toEqual({
        userId: 'user-2',
        status: 'offline',
        lastSeenAt: '2026-01-01T00:00:00Z',
      });
    });
  });
});

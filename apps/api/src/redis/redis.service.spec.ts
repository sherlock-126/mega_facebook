import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { REDIS_CLIENT } from './redis.constants';

describe('RedisService', () => {
  let service: RedisService;
  let mockRedis: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  describe('set', () => {
    it('should set a value without TTL', async () => {
      await service.set('key', 'value');
      expect(mockRedis.set).toHaveBeenCalledWith('key', 'value');
    });

    it('should set a value with TTL', async () => {
      await service.set('key', 'value', 60);
      expect(mockRedis.set).toHaveBeenCalledWith('key', 'value', 'EX', 60);
    });
  });

  describe('get', () => {
    it('should return value for existing key', async () => {
      mockRedis.get.mockResolvedValue('value');
      const result = await service.get('key');
      expect(result).toBe('value');
    });

    it('should return null for missing key', async () => {
      const result = await service.get('missing');
      expect(result).toBeNull();
    });
  });

  describe('blacklistJti', () => {
    it('should blacklist a JTI with TTL', async () => {
      await service.blacklistJti('jti123', 900);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'auth:jti:blacklist:jti123',
        '1',
        'EX',
        900,
      );
    });
  });

  describe('isJtiBlacklisted', () => {
    it('should return true for blacklisted JTI', async () => {
      mockRedis.get.mockResolvedValue('1');
      const result = await service.isJtiBlacklisted('jti123');
      expect(result).toBe(true);
    });

    it('should return false for non-blacklisted JTI', async () => {
      const result = await service.isJtiBlacklisted('jti123');
      expect(result).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit redis connection', async () => {
      await service.onModuleDestroy();
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});

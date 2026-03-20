import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;
  let redisService: RedisService;
  let prismaService: PrismaService;

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('signed-jwt-token'),
  };

  const mockRedisService = {
    blacklistJti: jest.fn().mockResolvedValue(undefined),
    isJtiBlacklisted: jest.fn().mockResolvedValue(false),
  };

  const mockPrismaService = {
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'token-id' }),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: number) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
    redisService = module.get<RedisService>(RedisService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate a JWT with sub, email, and jti', () => {
      const result = service.generateAccessToken('user-id', 'test@test.com');

      expect(result.token).toBe('signed-jwt-token');
      expect(result.jti).toBeDefined();
      expect(typeof result.jti).toBe('string');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-id', email: 'test@test.com', jti: expect.any(String) }),
        { expiresIn: 900 },
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should create a refresh token in the database and return raw token', async () => {
      const rawToken = await service.generateRefreshToken('user-id');

      expect(typeof rawToken).toBe('string');
      expect(rawToken.length).toBe(64); // 32 bytes hex
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-id',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
    });
  });

  describe('validateRefreshToken', () => {
    it('should return token data for valid token', async () => {
      mockPrismaService.refreshToken.findFirst.mockResolvedValue({
        id: 'token-id',
        userId: 'user-id',
      });

      const result = await service.validateRefreshToken('raw-token');

      expect(result).toEqual({ id: 'token-id', userId: 'user-id' });
      expect(mockPrismaService.refreshToken.findFirst).toHaveBeenCalledWith({
        where: {
          tokenHash: expect.any(String),
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
      });
    });

    it('should return null for invalid token', async () => {
      mockPrismaService.refreshToken.findFirst.mockResolvedValue(null);

      const result = await service.validateRefreshToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should update the token with revokedAt', async () => {
      await service.revokeRefreshToken('token-id');

      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-id' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('revokeAllUserRefreshTokens', () => {
    it('should revoke all active tokens for a user', async () => {
      await service.revokeAllUserRefreshTokens('user-id');

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('blacklistAccessToken', () => {
    it('should blacklist JTI in Redis with TTL', async () => {
      await service.blacklistAccessToken('jti-123', 600);

      expect(mockRedisService.blacklistJti).toHaveBeenCalledWith('jti-123', 600);
    });

    it('should not blacklist if TTL is 0 or negative', async () => {
      await service.blacklistAccessToken('jti-123', 0);
      await service.blacklistAccessToken('jti-123', -1);

      expect(mockRedisService.blacklistJti).not.toHaveBeenCalled();
    });
  });

  describe('isAccessTokenBlacklisted', () => {
    it('should check blacklist status', async () => {
      mockRedisService.isJtiBlacklisted.mockResolvedValue(true);

      const result = await service.isAccessTokenBlacklisted('jti-123');

      expect(result).toBe(true);
    });
  });

  describe('getAccessExpirationSeconds', () => {
    it('should return the configured expiration', () => {
      expect(service.getAccessExpirationSeconds()).toBe(900);
    });
  });

  describe('hashToken', () => {
    it('should produce consistent SHA-256 hash', () => {
      const hash1 = service.hashToken('test-token');
      const hash2 = service.hashToken('test-token');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 hex
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = service.hashToken('token-a');
      const hash2 = service.hashToken('token-b');
      expect(hash1).not.toBe(hash2);
    });
  });
});

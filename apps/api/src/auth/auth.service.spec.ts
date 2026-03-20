import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let tokenService: TokenService;

  const mockTokenService = {
    generateAccessToken: jest.fn().mockReturnValue({ token: 'access-token', jti: 'jti-123' }),
    generateRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
    validateRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
    revokeAllUserRefreshTokens: jest.fn().mockResolvedValue(undefined),
    blacklistAccessToken: jest.fn().mockResolvedValue(undefined),
    getAccessExpirationSeconds: jest.fn().mockReturnValue(900),
  };

  const mockPrismaService: Record<string, any> = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    passwordReset: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn((args: unknown) => {
      if (typeof args === 'function') {
        return args(mockPrismaService);
      }
      return Promise.all(args as Promise<unknown>[]);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: TokenService, useValue: mockTokenService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    tokenService = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a user and return id, email, createdAt', async () => {
      const mockUser = { id: 'uuid', email: 'test@test.com', createdAt: new Date() };
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await service.register('test@test.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: { email: 'test@test.com', passwordHash: 'hashed-password' },
        select: { id: true, email: true, createdAt: true },
      });
    });

    it('should throw ConflictException for duplicate email', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      mockPrismaService.user.create.mockRejectedValue(prismaError);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      await expect(service.register('dup@test.com', 'password123'))
        .rejects.toThrow(ConflictException);
    });

    it('should lowercase email', async () => {
      mockPrismaService.user.create.mockResolvedValue({ id: 'uuid', email: 'test@test.com', createdAt: new Date() });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      await service.register('Test@Test.COM', 'password123');

      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'test@test.com' }),
        }),
      );
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@test.com',
      passwordHash: 'hashed',
      status: 'ACTIVE',
    };

    it('should return tokens for valid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('test@test.com', 'password123');

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('nobody@test.com', 'password'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('test@test.com', 'wrong'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for SUSPENDED user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, status: 'SUSPENDED' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login('test@test.com', 'password123'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return new token pair for valid refresh token', async () => {
      mockTokenService.validateRefreshToken.mockResolvedValue({ id: 'rt-id', userId: 'user-id' });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'test@test.com',
        status: 'ACTIVE',
      });
      // $transaction calls the function with the prisma client
      const mockTx = {
        refreshToken: {
          findUnique: jest.fn().mockResolvedValue({ id: 'rt-id', revokedAt: null }),
          update: jest.fn().mockResolvedValue({}),
          updateMany: jest.fn(),
        },
      };
      mockPrismaService.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx));

      const result = await service.refresh('valid-refresh-token');

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockTokenService.validateRefreshToken.mockResolvedValue(null);

      await expect(service.refresh('invalid-token'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should blacklist access token JTI', async () => {
      const now = Math.floor(Date.now() / 1000);
      await service.logout('user-id', 'jti-123', now + 600);

      expect(mockTokenService.blacklistAccessToken).toHaveBeenCalledWith(
        'jti-123',
        expect.any(Number),
      );
    });

    it('should revoke refresh token if provided', async () => {
      const now = Math.floor(Date.now() / 1000);
      mockTokenService.validateRefreshToken.mockResolvedValue({ id: 'rt-id', userId: 'user-id' });

      await service.logout('user-id', 'jti-123', now + 600, 'refresh-token');

      expect(mockTokenService.revokeRefreshToken).toHaveBeenCalledWith('rt-id');
    });

    it('should not revoke refresh token if userId does not match', async () => {
      const now = Math.floor(Date.now() / 1000);
      mockTokenService.validateRefreshToken.mockResolvedValue({ id: 'rt-id', userId: 'other-user' });

      await service.logout('user-id', 'jti-123', now + 600, 'refresh-token');

      expect(mockTokenService.revokeRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should create a password reset record for existing user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-id', email: 'test@test.com' });

      await service.forgotPassword('test@test.com');

      expect(mockPrismaService.passwordReset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-id',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should silently return for non-existent email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.forgotPassword('nobody@test.com')).resolves.toBeUndefined();
      expect(mockPrismaService.passwordReset.create).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password and revoke all sessions', async () => {
      mockPrismaService.passwordReset.findUnique.mockResolvedValue({
        id: 'reset-id',
        userId: 'user-id',
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');
      mockPrismaService.$transaction.mockResolvedValue([{}, {}, {}]);

      await service.resetPassword('valid-token', 'newPassword123');

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 12);
    });

    it('should throw BadRequestException for expired token', async () => {
      mockPrismaService.passwordReset.findUnique.mockResolvedValue({
        id: 'reset-id',
        userId: 'user-id',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000), // expired
      });

      await expect(service.resetPassword('expired-token', 'newPassword'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already used token', async () => {
      mockPrismaService.passwordReset.findUnique.mockResolvedValue({
        id: 'reset-id',
        userId: 'user-id',
        usedAt: new Date(), // already used
        expiresAt: new Date(Date.now() + 3600000),
      });

      await expect(service.resetPassword('used-token', 'newPassword'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-existent token', async () => {
      mockPrismaService.passwordReset.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword('invalid-token', 'newPassword'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockProfile = { id: 'user-id', email: 'test@test.com', status: 'ACTIVE', createdAt: new Date() };
      mockPrismaService.user.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getProfile('user-id');

      expect(result).toEqual(mockProfile);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('missing-id'))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});

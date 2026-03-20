import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './services/token.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { Prisma } from '@prisma/client';

const BCRYPT_ROUNDS = 12;
const PASSWORD_RESET_EXPIRY_HOURS = 1;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async register(email: string, password: string) {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    try {
      const user = await this.prismaService.user.create({
        data: { email: email.toLowerCase(), passwordHash },
        select: { id: true, email: true, createdAt: true },
      });
      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async login(email: string, password: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Timing attack prevention: run dummy compare
      await bcrypt.compare(password, '$2a$12$x'.padEnd(60, '0'));
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { token: accessToken, jti: _jti } = this.tokenService.generateAccessToken(
      user.id,
      user.email,
    );
    const refreshToken = await this.tokenService.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.tokenService.getAccessExpirationSeconds(),
    };
  }

  async refresh(rawRefreshToken: string) {
    const tokenData = await this.tokenService.validateRefreshToken(rawRefreshToken);
    if (!tokenData) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Token rotation: revoke old token, issue new pair
    try {
      await this.prismaService.$transaction(async (tx) => {
        const token = await tx.refreshToken.findUnique({
          where: { id: tokenData.id },
        });

        if (!token || token.revokedAt !== null) {
          // Token was already revoked — possible theft, revoke all user tokens
          await tx.refreshToken.updateMany({
            where: { userId: tokenData.userId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          throw new UnauthorizedException('Invalid or expired refresh token');
        }

        await tx.refreshToken.update({
          where: { id: tokenData.id },
          data: { revokedAt: new Date() },
        });
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw error;
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: tokenData.userId },
      select: { id: true, email: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const { token: accessToken } = this.tokenService.generateAccessToken(user.id, user.email);
    const newRefreshToken = await this.tokenService.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.tokenService.getAccessExpirationSeconds(),
    };
  }

  async logout(userId: string, jti: string, exp: number, rawRefreshToken?: string) {
    // Blacklist the access token JTI
    const now = Math.floor(Date.now() / 1000);
    const remainingTtl = exp - now;
    await this.tokenService.blacklistAccessToken(jti, remainingTtl);

    // Revoke the refresh token if provided
    if (rawRefreshToken) {
      const tokenData = await this.tokenService.validateRefreshToken(rawRefreshToken);
      if (tokenData && tokenData.userId === userId) {
        await this.tokenService.revokeRefreshToken(tokenData.id);
      }
    }
  }

  async forgotPassword(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal whether email exists
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    await this.prismaService.passwordReset.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    // Email sending deferred — log token for development
    this.logger.log(`Password reset token for ${user.email}: ${rawToken}`);
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const resetRecord = await this.prismaService.passwordReset.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prismaService.$transaction([
      // Update password
      this.prismaService.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      // Mark all pending resets for this user as used
      this.prismaService.passwordReset.updateMany({
        where: { userId: resetRecord.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens
      this.prismaService.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async getProfile(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, status: true, createdAt: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}

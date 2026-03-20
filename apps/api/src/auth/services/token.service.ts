import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  jti: string;
}

@Injectable()
export class TokenService {
  private readonly accessExpirationSeconds: number;
  private readonly refreshExpirationDays: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
  ) {
    this.accessExpirationSeconds = this.configService.get<number>(
      'JWT_ACCESS_EXPIRATION',
      900,
    );
    this.refreshExpirationDays = this.configService.get<number>(
      'JWT_REFRESH_EXPIRATION_DAYS',
      7,
    );
  }

  generateAccessToken(userId: string, email: string): { token: string; jti: string } {
    const jti = randomBytes(16).toString('hex');
    const token = this.jwtService.sign(
      { sub: userId, email, jti },
      { expiresIn: this.accessExpirationSeconds },
    );
    return { token, jti };
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + this.refreshExpirationDays * 24 * 60 * 60 * 1000,
    );

    await this.prismaService.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return rawToken;
  }

  async validateRefreshToken(
    rawToken: string,
  ): Promise<{ id: string; userId: string } | null> {
    const tokenHash = this.hashToken(rawToken);
    const token = await this.prismaService.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!token) return null;
    return { id: token.id, userId: token.userId };
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.prismaService.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prismaService.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async blacklistAccessToken(jti: string, remainingTtlSeconds: number): Promise<void> {
    if (remainingTtlSeconds > 0) {
      await this.redisService.blacklistJti(jti, remainingTtlSeconds);
    }
  }

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    return this.redisService.isJtiBlacklisted(jti);
  }

  getAccessExpirationSeconds(): number {
    return this.accessExpirationSeconds;
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

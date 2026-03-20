import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, REDIS_KEY_PREFIX } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async blacklistJti(jti: string, ttlSeconds: number): Promise<void> {
    const key = `${REDIS_KEY_PREFIX.JTI_BLACKLIST}${jti}`;
    await this.set(key, '1', ttlSeconds);
  }

  async isJtiBlacklisted(jti: string): Promise<boolean> {
    const key = `${REDIS_KEY_PREFIX.JTI_BLACKLIST}${jti}`;
    const result = await this.get(key);
    return result !== null;
  }
}

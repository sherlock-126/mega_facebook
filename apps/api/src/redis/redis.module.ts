import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
        return new Redis(url, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}

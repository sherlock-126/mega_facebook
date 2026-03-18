import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { MediaModule } from './media/media.module';
import { ProfileModule } from './profile/profile.module';
import { FriendshipModule } from './friendship/friendship.module';
import { UserSearchModule } from './user-search/user-search.module';
import { PostModule } from './post/post.module';
import { FeedModule } from './feed/feed.module';
import { ReactionModule } from './reaction/reaction.module';
import { CommentModule } from './comment/comment.module';
import { WebsocketModule } from './websocket/websocket.module';
import { MessageModule } from './message/message.module';
import { NotificationModule } from './notification/notification.module';
import { ThrottlerBehindProxyGuard } from './auth/guards/throttler-behind-proxy.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    MediaModule,
    ProfileModule,
    FriendshipModule,
    UserSearchModule,
    PostModule,
    FeedModule,
    ReactionModule,
    CommentModule,
    WebsocketModule,
    MessageModule,
    NotificationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { FriendshipModule } from '../friendship/friendship.module';

@Module({
  imports: [FriendshipModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}

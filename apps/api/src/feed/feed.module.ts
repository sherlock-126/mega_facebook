import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { FriendshipModule } from '../friendship/friendship.module';
import { BlockModule } from '../block/block.module';

@Module({
  imports: [FriendshipModule, BlockModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}

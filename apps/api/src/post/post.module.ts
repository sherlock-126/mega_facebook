import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { FriendshipModule } from '../friendship/friendship.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [FriendshipModule, SearchModule],
  controllers: [PostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}

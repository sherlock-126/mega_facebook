import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchIndexerService } from './search-indexer.service';
import { FriendshipModule } from '../friendship/friendship.module';
import { BlockModule } from '../block/block.module';

@Module({
  imports: [FriendshipModule, BlockModule],
  controllers: [SearchController],
  providers: [SearchService, SearchIndexerService],
  exports: [SearchIndexerService],
})
export class SearchModule {}

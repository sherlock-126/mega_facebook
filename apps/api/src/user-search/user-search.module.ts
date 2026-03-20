import { Module } from '@nestjs/common';
import { UserSearchController } from './user-search.controller';
import { UserSearchService } from './user-search.service';
import { BlockModule } from '../block/block.module';

@Module({
  imports: [BlockModule],
  controllers: [UserSearchController],
  providers: [UserSearchService],
  exports: [UserSearchService],
})
export class UserSearchModule {}

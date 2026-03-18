import { Module } from '@nestjs/common';
import { UserSearchController } from './user-search.controller';
import { UserSearchService } from './user-search.service';

@Module({
  controllers: [UserSearchController],
  providers: [UserSearchService],
  exports: [UserSearchService],
})
export class UserSearchModule {}

import { Module } from '@nestjs/common';
import { FriendshipModule } from '../friendship/friendship.module';
import { BlockModule } from '../block/block.module';
import { PresenceService } from './presence.service';
import { PresenceController } from './presence.controller';
import { PresenceGateway } from './presence.gateway';

@Module({
  imports: [FriendshipModule, BlockModule],
  controllers: [PresenceController],
  providers: [PresenceService, PresenceGateway],
  exports: [PresenceService],
})
export class PresenceModule {}

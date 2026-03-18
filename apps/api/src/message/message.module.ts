import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { MessageGateway } from './message.gateway';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [MessageController],
  providers: [MessageService, MessageGateway],
  exports: [MessageService],
})
export class MessageModule {}

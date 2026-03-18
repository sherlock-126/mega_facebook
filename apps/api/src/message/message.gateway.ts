import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MessageService } from './message.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedSocket } from '../websocket/ws-auth.middleware';
import { MESSAGE_THROTTLE_LIMIT, MESSAGE_THROTTLE_TTL } from './constants/message.constants';

@WebSocketGateway()
export class MessageGateway {
  private readonly logger = new Logger(MessageGateway.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly wsGateway: WebsocketGateway,
    private readonly prisma: PrismaService,
  ) {}

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    try {
      if (!data.conversationId || !data.content?.trim()) {
        throw new WsException('Invalid message data');
      }

      const message = await this.messageService.sendMessage(
        data.conversationId,
        client.userId,
        { content: data.content.trim() },
      );

      return { event: 'message:sent', data: message };
    } catch (error: any) {
      throw new WsException(error.message || 'Failed to send message');
    }
  }

  @SubscribeMessage('message:typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!data.conversationId) return;

    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: data.conversationId },
    });

    for (const participant of participants) {
      if (participant.userId !== client.userId) {
        this.wsGateway.emitToUser(participant.userId, 'message:typing', {
          conversationId: data.conversationId,
          userId: client.userId,
        });
      }
    }
  }

  @SubscribeMessage('message:stop_typing')
  async handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!data.conversationId) return;

    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: data.conversationId },
    });

    for (const participant of participants) {
      if (participant.userId !== client.userId) {
        this.wsGateway.emitToUser(participant.userId, 'message:stop_typing', {
          conversationId: data.conversationId,
          userId: client.userId,
        });
      }
    }
  }

  @SubscribeMessage('message:read')
  async handleRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      if (!data.conversationId) return;

      await this.messageService.markAsRead(data.conversationId, client.userId);
    } catch (error: any) {
      this.logger.warn(`Read receipt failed: ${error.message}`);
    }
  }
}

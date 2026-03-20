import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuthenticatedSocket } from '../websocket/ws-auth.middleware';
import { BlockService } from '../block/block.service';
import { PresenceService } from './presence.service';
import { PRESENCE_EVENTS, PRESENCE_SUBSCRIBE_TTL } from './constants/presence.constants';
import { WebsocketGateway as WsGateway } from '../websocket/websocket.gateway';

@WebSocketGateway({ cors: { origin: '*' } })
export class PresenceGateway {
  private readonly logger = new Logger(PresenceGateway.name);
  private subscriptions = new Map<string, Map<string, NodeJS.Timeout>>();

  constructor(
    private readonly presenceService: PresenceService,
    private readonly blockService: BlockService,
    private readonly websocketGateway: WsGateway,
  ) {}

  @OnEvent(PRESENCE_EVENTS.WS_USER_CONNECTED)
  async handleUserConnected(payload: { userId: string }) {
    await this.presenceService.handleUserConnected(payload.userId);
  }

  @OnEvent(PRESENCE_EVENTS.WS_USER_DISCONNECTED)
  async handleUserDisconnected(payload: { userId: string }) {
    await this.presenceService.handleUserDisconnected(payload.userId);
  }

  @SubscribeMessage(PRESENCE_EVENTS.PRESENCE_SUBSCRIBE)
  async handlePresenceSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string },
  ) {
    const subscriberId = client.userId;
    if (!subscriberId || !data?.userId) return;

    try {
      const blocked = await this.blockService.isBlocked(subscriberId, data.userId);
      if (blocked) return;

      // Track subscription with auto-expiry
      if (!this.subscriptions.has(subscriberId)) {
        this.subscriptions.set(subscriberId, new Map());
      }

      const userSubs = this.subscriptions.get(subscriberId)!;

      // Clear existing timer for this target
      const existing = userSubs.get(data.userId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        userSubs.delete(data.userId);
        if (userSubs.size === 0) {
          this.subscriptions.delete(subscriberId);
        }
      }, PRESENCE_SUBSCRIBE_TTL * 1000);

      userSubs.set(data.userId, timer);

      // Send current presence immediately
      const presence = await this.presenceService.getPresence(data.userId, subscriberId);
      this.websocketGateway.emitToUser(subscriberId, PRESENCE_EVENTS.PRESENCE_UPDATE, presence);
    } catch (error) {
      this.logger.error(`Failed to handle presence subscribe`, error);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    if (userId) {
      const subs = this.subscriptions.get(userId);
      if (subs) {
        for (const timer of subs.values()) {
          clearTimeout(timer);
        }
        this.subscriptions.delete(userId);
      }
    }
  }
}

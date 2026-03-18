import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { FriendshipService } from '../friendship/friendship.service';
import { BlockService } from '../block/block.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import {
  PRESENCE_KEY_PREFIX,
  PRESENCE_COUNT_SUFFIX,
  PRESENCE_PENDING_OFFLINE_SUFFIX,
  PRESENCE_OFFLINE_TTL,
  PRESENCE_COUNT_TTL,
  PRESENCE_PENDING_OFFLINE_TTL,
  PRESENCE_EVENTS,
} from './constants/presence.constants';

export interface PresenceData {
  userId: string;
  status: 'online' | 'offline' | 'unknown';
  lastSeenAt: string | null;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private pendingOfflineTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly friendshipService: FriendshipService,
    private readonly blockService: BlockService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async handleUserConnected(userId: string): Promise<void> {
    try {
      const countKey = this.getCountKey(userId);
      const count = await this.redis.incr(countKey);
      await this.redis.expire(countKey, PRESENCE_COUNT_TTL);

      // Cancel any pending offline broadcast
      const pendingTimer = this.pendingOfflineTimers.get(userId);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        this.pendingOfflineTimers.delete(userId);
        await this.redis.del(this.getPendingOfflineKey(userId));
      }

      // First connection → user came online
      if (count === 1) {
        await this.setPresenceState(userId, 'online');
        await this.broadcastPresenceToFriends(userId, 'online', null);
      }
    } catch (error) {
      this.logger.error(`Failed to handle user connected: ${userId}`, error);
    }
  }

  async handleUserDisconnected(userId: string): Promise<void> {
    try {
      const countKey = this.getCountKey(userId);
      const count = await this.redis.decr(countKey);

      if (count <= 0) {
        // Clean up counter
        await this.redis.del(countKey);

        // Set pending offline with 3-second delay
        await this.redis.set(
          this.getPendingOfflineKey(userId),
          '1',
          'EX',
          PRESENCE_PENDING_OFFLINE_TTL,
        );

        const timer = setTimeout(async () => {
          this.pendingOfflineTimers.delete(userId);
          try {
            // Recheck count in case of rapid reconnect
            const currentCount = await this.redis.get(countKey);
            if (currentCount && parseInt(currentCount, 10) > 0) {
              return;
            }

            const lastSeenAt = new Date().toISOString();
            await this.setPresenceState(userId, 'offline', lastSeenAt);
            await this.broadcastPresenceToFriends(userId, 'offline', lastSeenAt);
          } catch (error) {
            this.logger.error(`Failed to process offline for user: ${userId}`, error);
          }
        }, PRESENCE_PENDING_OFFLINE_TTL * 1000);

        this.pendingOfflineTimers.set(userId, timer);
      } else {
        // Still has other connections, refresh TTL
        await this.redis.expire(countKey, PRESENCE_COUNT_TTL);
      }
    } catch (error) {
      this.logger.error(`Failed to handle user disconnected: ${userId}`, error);
    }
  }

  async getPresence(userId: string, requesterId?: string): Promise<PresenceData> {
    // Check block status
    if (requesterId) {
      try {
        const blocked = await this.blockService.isBlocked(requesterId, userId);
        if (blocked) {
          return { userId, status: 'offline', lastSeenAt: null };
        }
      } catch (error) {
        this.logger.error(`Failed to check block status`, error);
      }
    }

    try {
      const data = await this.redis.get(this.getPresenceKey(userId));
      if (!data) {
        return { userId, status: 'offline', lastSeenAt: null };
      }

      const parsed = JSON.parse(data);
      return {
        userId,
        status: parsed.status,
        lastSeenAt: parsed.lastSeenAt ?? null,
      };
    } catch (error) {
      this.logger.error(`Failed to get presence for user: ${userId}`, error);
      return { userId, status: 'unknown', lastSeenAt: null };
    }
  }

  async getBatchPresence(userIds: string[], requesterId: string): Promise<PresenceData[]> {
    let blockedIds: string[] = [];
    try {
      blockedIds = await this.blockService.getBlockedUserIds(requesterId);
    } catch (error) {
      this.logger.error('Failed to get blocked user IDs', error);
    }

    const blockedSet = new Set(blockedIds);
    const filteredIds = userIds.filter((id) => !blockedSet.has(id));

    const results: PresenceData[] = [];
    for (const userId of filteredIds) {
      const presence = await this.getPresence(userId);
      results.push(presence);
    }

    return results;
  }

  private async setPresenceState(
    userId: string,
    status: 'online' | 'offline',
    lastSeenAt?: string,
  ): Promise<void> {
    const key = this.getPresenceKey(userId);
    const data = JSON.stringify({
      status,
      lastSeenAt: lastSeenAt ?? null,
    });

    if (status === 'offline') {
      await this.redis.set(key, data, 'EX', PRESENCE_OFFLINE_TTL);
    } else {
      await this.redis.set(key, data);
    }
  }

  private async broadcastPresenceToFriends(
    userId: string,
    status: 'online' | 'offline',
    lastSeenAt: string | null,
  ): Promise<void> {
    try {
      const friendIds = await this.friendshipService.getFriendIds(userId);
      const blockedIds = await this.blockService.getBlockedUserIds(userId);
      const blockedSet = new Set(blockedIds);

      const payload = { userId, status, lastSeenAt };

      for (const friendId of friendIds) {
        if (!blockedSet.has(friendId)) {
          this.websocketGateway.emitToUser(friendId, PRESENCE_EVENTS.PRESENCE_UPDATE, payload);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to broadcast presence for user: ${userId}`, error);
    }
  }

  private getPresenceKey(userId: string): string {
    return `${PRESENCE_KEY_PREFIX}${userId}`;
  }

  private getCountKey(userId: string): string {
    return `${PRESENCE_KEY_PREFIX}${userId}${PRESENCE_COUNT_SUFFIX}`;
  }

  private getPendingOfflineKey(userId: string): string {
    return `${PRESENCE_KEY_PREFIX}${userId}${PRESENCE_PENDING_OFFLINE_SUFFIX}`;
  }
}

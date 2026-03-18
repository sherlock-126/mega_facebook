import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { AuthenticatedSocket, createWsAuthMiddleware } from './ws-auth.middleware';

@WebSocketGateway({ cors: { origin: '*' } })
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  afterInit(server: Server) {
    server.use(createWsAuthMiddleware(this.jwtService, this.redisService));
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: AuthenticatedSocket) {
    const userId = client.userId;
    if (!userId) {
      client.disconnect();
      return;
    }

    client.join(`user:${userId}`);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}

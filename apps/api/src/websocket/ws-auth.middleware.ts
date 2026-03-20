import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  email: string;
}

export function createWsAuthMiddleware(
  jwtService: JwtService,
  redisService: RedisService,
) {
  return async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const payload = jwtService.verify(token);

      if (payload.jti) {
        const isBlacklisted = await redisService.isJtiBlacklisted(payload.jti);
        if (isBlacklisted) {
          return next(new Error('Unauthorized'));
        }
      }

      (socket as AuthenticatedSocket).userId = payload.sub;
      (socket as AuthenticatedSocket).email = payload.email;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  };
}

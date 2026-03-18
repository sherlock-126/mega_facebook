import { Global, Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebsocketGateway } from './websocket.gateway';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'dev-secret-do-not-use-in-production'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}

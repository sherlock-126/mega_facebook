import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { S3_CLIENT } from './media.constants';
import { MediaService } from './media.service';

@Global()
@Module({
  providers: [
    {
      provide: S3_CLIENT,
      useFactory: (configService: ConfigService) => {
        const endpoint = configService.get<string>('MINIO_ENDPOINT', 'localhost');
        const port = configService.get<number>('MINIO_PORT', 9000);
        const useSsl = configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
        const protocol = useSsl ? 'https' : 'http';

        return new S3Client({
          endpoint: `${protocol}://${endpoint}:${port}`,
          region: 'us-east-1',
          credentials: {
            accessKeyId: configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
            secretAccessKey: configService.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
          },
          forcePathStyle: true,
        });
      },
      inject: [ConfigService],
    },
    MediaService,
  ],
  exports: [MediaService],
})
export class MediaModule {}

import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { S3_CLIENT } from '../media/media.constants';

@Injectable()
export class MediaHealthIndicator extends HealthIndicator {
  private readonly defaultBucket: string;

  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    private readonly configService: ConfigService,
  ) {
    super();
    this.defaultBucket = this.configService.get<string>('MINIO_BUCKET', 'mega-uploads');
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.defaultBucket }));
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Storage check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}

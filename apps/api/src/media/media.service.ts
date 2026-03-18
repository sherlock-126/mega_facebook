import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { S3_CLIENT } from './media.constants';

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private readonly defaultBucket: string;

  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    private readonly configService: ConfigService,
  ) {
    this.defaultBucket = this.configService.get<string>('MINIO_BUCKET', 'mega-uploads');
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.defaultBucket }));
      this.logger.log(`Bucket "${this.defaultBucket}" exists`);
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        try {
          await this.s3.send(new CreateBucketCommand({ Bucket: this.defaultBucket }));
          this.logger.log(`Bucket "${this.defaultBucket}" created`);
        } catch (createError) {
          this.logger.warn(`Failed to create bucket "${this.defaultBucket}": ${(createError as Error).message}`);
        }
      } else {
        this.logger.warn(`Failed to check bucket "${this.defaultBucket}": ${(error as Error).message}`);
      }
    }
  }

  async upload(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string,
    bucket?: string,
  ): Promise<{ key: string; bucket: string }> {
    const targetBucket = bucket ?? this.defaultBucket;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: targetBucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return { key, bucket: targetBucket };
  }

  async getSignedUrl(
    key: string,
    bucket?: string,
    expiresIn = 3600,
  ): Promise<string> {
    const targetBucket = bucket ?? this.defaultBucket;
    const command = new GetObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async delete(key: string, bucket?: string): Promise<void> {
    const targetBucket = bucket ?? this.defaultBucket;
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: targetBucket,
        Key: key,
      }),
    );
  }

  async listFiles(
    prefix?: string,
    bucket?: string,
    maxKeys = 1000,
  ): Promise<string[]> {
    const targetBucket = bucket ?? this.defaultBucket;
    const result = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: targetBucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      }),
    );
    return (result.Contents ?? []).map((item) => item.Key!);
  }
}

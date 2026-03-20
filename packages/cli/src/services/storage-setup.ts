import { S3Client, CreateBucketCommand, HeadBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger.js';
import { CONSTANTS } from '../constants.js';
import { loadEnvVariables } from './env-generator.js';

export async function createMinioBucket(): Promise<void> {
  logger.info('Setting up MinIO storage bucket...');

  const env = await loadEnvVariables();

  // Configure S3 client for MinIO
  const client = new S3Client({
    endpoint: `http://${env.MINIO_ENDPOINT || 'localhost'}:${env.MINIO_PORT || '9000'}`,
    region: CONSTANTS.MINIO_CONFIG.region,
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY || 'minioadmin',
      secretAccessKey: env.MINIO_SECRET_KEY || 'minioadmin',
    },
    forcePathStyle: true, // Required for MinIO
  });

  const bucketName = env.MINIO_BUCKET || CONSTANTS.MINIO_CONFIG.bucket;

  try {
    // Check if bucket already exists
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    logger.info(`Bucket '${bucketName}' already exists`);
    return;
  } catch (error: any) {
    // Bucket doesn't exist, create it
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      try {
        await client.send(
          new CreateBucketCommand({
            Bucket: bucketName,
          })
        );
        logger.success(`Created MinIO bucket: ${bucketName}`);
      } catch (createError: any) {
        if (createError.name === 'BucketAlreadyExists' || createError.name === 'BucketAlreadyOwnedByYou') {
          logger.info(`Bucket '${bucketName}' already exists`);
        } else {
          throw new Error(`Failed to create MinIO bucket: ${createError.message}`);
        }
      }
    } else if (error.name === 'NetworkingError' || error.code === 'ECONNREFUSED') {
      throw new Error(
        'Cannot connect to MinIO. Please ensure MinIO service is running.'
      );
    } else {
      throw new Error(`Failed to check MinIO bucket: ${error.message}`);
    }
  }
}

export async function checkMinIOConnection(): Promise<{
  connected: boolean;
  error?: string;
  buckets?: string[];
}> {
  try {
    const env = await loadEnvVariables();

    const client = new S3Client({
      endpoint: `http://${env.MINIO_ENDPOINT || 'localhost'}:${env.MINIO_PORT || '9000'}`,
      region: CONSTANTS.MINIO_CONFIG.region,
      credentials: {
        accessKeyId: env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: env.MINIO_SECRET_KEY || 'minioadmin',
      },
      forcePathStyle: true,
    });

    // Try to list buckets to test connection
    const response = await client.send(new ListBucketsCommand({}));
    const buckets = response.Buckets?.map((b) => b.Name || '') || [];

    return {
      connected: true,
      buckets,
    };
  } catch (error: any) {
    if (error.name === 'NetworkingError' || error.code === 'ECONNREFUSED') {
      return {
        connected: false,
        error: 'Cannot connect to MinIO service',
      };
    }

    return {
      connected: false,
      error: error.message,
    };
  }
}

export async function resetMinioBucket(): Promise<void> {
  logger.info('Resetting MinIO bucket...');

  const env = await loadEnvVariables();
  const bucketName = env.MINIO_BUCKET || CONSTANTS.MINIO_CONFIG.bucket;

  // For reset, we would typically delete and recreate the bucket
  // However, deleting a bucket requires it to be empty first
  // For simplicity, we'll just ensure the bucket exists
  logger.warning(`Note: Bucket '${bucketName}' contents are not deleted. Manual cleanup may be required.`);

  await createMinioBucket();
}
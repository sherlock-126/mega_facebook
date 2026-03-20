import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const CONSTANTS = {
  MIN_NODE_VERSION: '20.0.0',
  REQUIRED_PORTS: {
    web: 3000,
    api: 3001,
    postgres: 5432,
    redis: 6379,
    minio: 9000,
    minioConsole: 9001,
    elasticsearch: 9200,
  },
  DOCKER_SERVICES: [
    'postgres',
    'redis',
    'minio',
    'elasticsearch',
  ],
  ENV_FILES: {
    api: 'apps/api/.env',
    web: 'apps/web/.env.local',
  },
  MINIO_CONFIG: {
    bucket: 'autonow-uploads',
    region: 'us-east-1',
  },
  R2_CONFIG: {
    accountId: 'f7dfac1ca34f6e838fb035fd562bcff3',
    bucketName: 'maytrix',
    baseUrl: process.env.R2_PUBLIC_URL || 'https://maytrix.pub.r2.dev',
  },
  PATHS: {
    root: join(__dirname, '..', '..', '..'),
    envExample: '.env.example',
    dockerCompose: 'docker/docker-compose.yml',
  },
  TIMEOUTS: {
    dockerHealthCheck: 30000,
    serviceStartup: 60000,
  },
  CLI_STATE_FILE: '.autonow-fb-state.json',
  CLI_CONFIG_DIR: '.autonow-fb',
} as const;
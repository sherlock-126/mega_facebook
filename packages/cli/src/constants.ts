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
    dockerComposeProd: 'docker/docker-compose.prod.yml',
    configFile: join(process.env.HOME || '', '.autonow-fb', 'config.json'),
  },
  COMMANDS: {
    docker: {
      up: 'docker-compose -f docker/docker-compose.yml up -d',
      down: 'docker-compose -f docker/docker-compose.yml down',
      ps: 'docker-compose -f docker/docker-compose.yml ps',
      logs: 'docker-compose -f docker/docker-compose.yml logs',
    },
    pnpm: {
      install: 'pnpm install',
      dev: 'pnpm dev',
      build: 'pnpm build',
      migrate: 'pnpm db:migrate',
      seed: 'pnpm db:seed',
    },
  },
};
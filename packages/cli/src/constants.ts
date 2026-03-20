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
    bucket: 'mega-uploads',
    region: 'us-east-1',
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
  CLI_STATE_FILE: '.mega-cli-state.json',
} as const;
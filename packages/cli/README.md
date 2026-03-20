# @mega/cli

Interactive CLI tool for setting up and managing the Mega Facebook platform.

## Features

- 🚀 **Interactive Setup Wizard** - Guided setup with beautiful prompts
- 🔍 **System Requirements Check** - Validates Node.js and Docker installation
- 📝 **Environment Configuration** - Generates `.env` files from templates
- 🐳 **Docker Management** - Starts and manages Docker services
- 🗄️ **Database Setup** - Runs migrations and optional data seeding
- 📦 **Storage Configuration** - Sets up MinIO buckets
- 🩺 **Health Checks** - Diagnose system issues with `doctor` command
- 🔄 **Reset Functionality** - Clean slate with data removal

## Installation

The CLI is included in the monorepo and can be run directly with pnpm:

```bash
# From the project root
pnpm cli setup
```

Or use npx:

```bash
npx @mega/cli setup
```

## Commands

### `setup` (default)

Interactive wizard that guides you through the complete setup process:

```bash
npx @mega/cli setup
```

The wizard will:
1. Check Node.js version (≥20.0.0) and Docker installation
2. Generate environment files from templates
3. Start Docker services (PostgreSQL, Redis, MinIO, Elasticsearch)
4. Run database migrations
5. Create MinIO storage bucket
6. Optionally seed the database with sample data

### `doctor`

Check the health of your Mega Facebook installation:

```bash
npx @mega/cli doctor
```

Reports status of:
- System requirements (Node.js, Docker, ports)
- Environment configuration
- Docker services health
- Database connection and migrations
- MinIO storage connection

### `reset`

Reset the environment to a clean state:

```bash
npx @mega/cli reset
```

This will:
- Stop all Docker services
- Remove Docker volumes (deletes all data)
- Optionally restart the setup process

Use `--force` to skip confirmation prompts:

```bash
npx @mega/cli reset --force
```

## Development

To work on the CLI itself:

```bash
# Install dependencies
pnpm install

# Build the CLI
pnpm --filter @mega/cli build

# Watch mode during development
pnpm --filter @mega/cli dev
```

## System Requirements

- Node.js ≥ 20.0.0
- Docker & Docker Compose
- Available ports:
  - 3000 (Web app)
  - 3001 (API server)
  - 5432 (PostgreSQL)
  - 6379 (Redis)
  - 9000 (MinIO)
  - 9001 (MinIO Console)
  - 9200 (Elasticsearch)

## Troubleshooting

### Port Conflicts

If you see port conflict warnings, stop other services using those ports or modify the port configuration in `.env` files.

### Docker Connection Issues

Ensure Docker Desktop or Docker Engine is running:

```bash
docker info
```

### Database Connection Failed

Check that PostgreSQL container is healthy:

```bash
docker ps
docker logs mega_postgres
```

### MinIO Connection Failed

MinIO may take longer to start. Check its status:

```bash
docker logs mega_minio
```

## License

Part of the Mega Facebook monorepo.
# Mega Facebook

Social networking platform built with a modern monorepo architecture.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **API**: NestJS 10 + Prisma ORM + PostgreSQL 16
- **Web**: Next.js 14 + React 18 + Tailwind CSS
- **Infrastructure**: Docker Compose (PostgreSQL, Redis, MinIO, Elasticsearch)
- **CI/CD**: GitHub Actions

## 🚀 Quick Start - One-Click Install

```bash
# Install and run with our CLI tool
npx @mega/cli setup

# That's it! Your platform is running 🎉
```

Or install the CLI globally for easier access:

```bash
npm install -g @mega/cli
mega-cli setup
```

The CLI will automatically:
- ✅ Check system requirements
- ✅ Clone/update the repository
- ✅ Install dependencies
- ✅ Generate environment files
- ✅ Start Docker services
- ✅ Run database migrations
- ✅ Create storage buckets
- ✅ Seed sample data
- ✅ Provide test accounts

## Getting Started (Manual Setup)

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Manual Setup with Automated Migrations & Seeding

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start infrastructure (auto-runs migrations)
pnpm docker:up

# Generate Prisma client
pnpm db:generate

# Run database migrations (if not using Docker)
pnpm db:migrate

# Seed the database with sample data
pnpm --filter api seed              # Default: sample data
pnpm --filter api seed -- --admin-only  # Only admin account
pnpm --filter api seed -- --full       # Full demo dataset

# Run development servers
pnpm dev
```

### Automated Features

The project includes automatic database setup:
- **Auto-migrations**: Migrations run automatically when Docker containers start
- **Flexible seeding**: Three seeding modes for different environments
- **Test accounts**: Pre-configured user accounts for testing

### Default Test Accounts

After seeding, you can log in with these accounts:

| Account | Email | Password |
| ------- | ----- | -------- |
| Admin | admin@mega.dev | Admin123! |
| User 1 | user1@mega.dev | Test1234! |
| User 2 | user2@mega.dev | Test1234! |
| User 3 | user3@mega.dev | Test1234! |
| User 4 | user4@mega.dev | Test1234! |
| User 5 | user5@mega.dev | Test1234! |

### Ports

| Service       | Port |
| ------------- | ---- |
| Next.js Web   | 3000 |
| NestJS API    | 3001 |
| PostgreSQL    | 5432 |
| Redis         | 6379 |
| MinIO         | 9000 |
| MinIO Console | 9001 |
| Elasticsearch | 9200 |

## Project Structure

```
mega-facebook/
├── apps/
│   ├── api/          # NestJS API server
│   └── web/          # Next.js web application
├── packages/
│   ├── shared/       # Shared types and utilities
│   └── ui/           # Shared UI components
├── docker/           # Docker Compose configurations
└── .github/          # CI/CD workflows
```

## Scripts

```bash
pnpm dev          # Start all dev servers
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm lint         # Lint all packages
pnpm format       # Format all files
pnpm docker:up    # Start Docker services
pnpm docker:down  # Stop Docker services
pnpm db:migrate   # Run database migrations
pnpm db:seed      # Seed database with sample data
```

## Database Seeding

The project includes a flexible seeding system with three modes:

### 1. Admin Only Mode (`--admin-only`)
- Creates only the admin account
- Ideal for production environments
- Minimal data footprint

### 2. Sample Mode (default)
- Creates admin + 5 test users
- Adds sample posts, friendships, messages
- Perfect for development and testing

### 3. Full Mode (`--full`)
- Creates 20+ users with realistic profiles
- Generates extensive social network
- Includes posts, comments, reactions, messages
- Best for demos and load testing

```bash
# Run seeding with different modes
cd apps/api
npm run seed              # Sample data (default)
npm run seed -- --admin-only  # Only admin account
npm run seed -- --full       # Complete demo dataset
npm run seed -- --force      # Re-seed even if data exists
```

## Production Deployment

### Docker Production Setup

This project includes production-ready Docker configurations with:
- Multi-stage builds for optimized image sizes
- Security hardening for all services
- Nginx reverse proxy with SSL/TLS support
- Health checks and service dependencies
- Resource limits and restart policies
- **Automatic database migrations on startup**
- **Optional admin account creation**

#### Quick Start

```bash
# Copy production environment template
cp docker/.env.prod.example docker/.env.prod

# Edit with your production values
nano docker/.env.prod

# Build production images
DOCKER_BUILDKIT=1 docker compose -f docker/docker-compose.prod.yml build

# Start all services (migrations run automatically)
docker compose -f docker/docker-compose.prod.yml up -d

# Optional: Create admin account if not done automatically
docker compose -f docker/docker-compose.prod.yml exec api npm run seed -- --admin-only
```

#### Automatic Migration System

The production setup includes an init container that:
1. Waits for PostgreSQL to be ready
2. Runs all pending Prisma migrations
3. Optionally creates an admin account (if `SEED_ADMIN=true`)
4. Exits successfully, allowing the API to start

This ensures your database is always up-to-date without manual intervention.

For detailed deployment instructions, see [docker/README.md](docker/README.md).

### Production Architecture

- **Nginx**: Reverse proxy (ports 80/443) → routes to API/Web
- **API**: NestJS backend (internal port 3001)
- **Web**: Next.js frontend (internal port 3000)
- **PostgreSQL**: Primary database with optimizations
- **Redis**: Cache with password protection
- **MinIO**: Object storage with secure access
- **Elasticsearch**: Search engine with authentication

### Security Features

- Non-root users in containers
- Network isolation with Docker networks
- Environment-based secrets management
- Rate limiting and CORS configuration
- SSL/TLS termination at Nginx
- Health checks for all services

# Mega Facebook

Social networking platform built with a modern monorepo architecture.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **API**: NestJS 10 + Prisma ORM + PostgreSQL 16
- **Web**: Next.js 14 + React 18 + Tailwind CSS
- **Infrastructure**: Docker Compose (PostgreSQL, Redis, MinIO, Elasticsearch)
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start infrastructure
pnpm docker:up

# Generate Prisma client
pnpm db:generate

# Run development servers
pnpm dev
```

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
```

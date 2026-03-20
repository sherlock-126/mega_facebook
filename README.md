# AutoNow FB

Next-generation social platform built with modern monorepo architecture.

## 🚀 Quick Start

### Option 1: Download from Cloud (Recommended)

```bash
# Download and install latest version
npx autonow-fb install

# Then run setup
autonow-fb setup
```

### Option 2: Interactive Setup with CLI

```bash
# Run the interactive setup wizard
npx autonow-fb setup
```

Or install the CLI globally for easier access:

```bash
npm install -g autonow-fb
autonow-fb setup
```

The CLI will automatically:
- ✅ Check Node.js and Docker requirements
- ✅ Clone/update the repository
- ✅ Install dependencies
- ✅ Generate environment files
- ✅ Start Docker services
- ✅ Run database migrations
- ✅ Create storage buckets
- ✅ Seed sample data
- ✅ Provide test accounts

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **API**: NestJS 10 + Prisma ORM + PostgreSQL 16
- **Web**: Next.js 14 + React 18 + Tailwind CSS
- **Infrastructure**: Docker Compose (PostgreSQL, Redis, MinIO, Elasticsearch)
- **CI/CD**: GitHub Actions + Cloudflare R2
- **CLI**: AutoNow FB CLI for easy setup and management

## Manual Setup

### System Requirements

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Installation Steps

```bash
# Clone repository
git clone https://github.com/sherlock-126/mega_facebook.git
cd mega_facebook

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start infrastructure (auto-runs migrations in Docker)
pnpm docker:up

# Generate Prisma client
pnpm db:generate

# Run database migrations (if not using Docker auto-migration)
pnpm db:migrate

# Seed the database with sample data
pnpm --filter api seed              # Default: sample data
pnpm --filter api seed -- --admin-only  # Only admin account
pnpm --filter api seed -- --full       # Full demo dataset

# Run development servers
pnpm dev
```

## 🌐 Access URLs

- **Web App**: http://localhost:3000
- **API**: http://localhost:3001/api-docs
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

## 📦 Project Structure

```
mega_facebook/
├── apps/
│   ├── api/          # NestJS API backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── cli/          # AutoNow FB CLI tool
│   ├── shared/       # Shared types & utilities
│   └── ui/           # Shared UI components
├── docker/           # Docker configurations
└── scripts/          # Build & deployment scripts
```

## 🔑 Test Accounts

After seeding the database, use these accounts:

**Admin:**
- Email: admin@example.com
- Password: admin123

**Regular Users:**
- john.doe@example.com / password123
- jane.smith@example.com / password123
- mike.johnson@example.com / password123

## 📚 Available Commands

```bash
# CLI Commands
autonow-fb               # Interactive setup wizard
autonow-fb doctor        # Check system health
autonow-fb reset         # Reset environment
autonow-fb install       # Download from cloud
autonow-fb update        # Update to latest version
autonow-fb start         # Start all services
autonow-fb stop          # Stop all services
autonow-fb logs          # View service logs
autonow-fb seed          # Generate sample data

# Development Commands
pnpm dev                 # Start development servers
pnpm build               # Build all packages
pnpm lint                # Run linting
pnpm test                # Run tests
pnpm db:migrate          # Run database migrations
pnpm db:seed             # Seed database
pnpm docker:up           # Start Docker services
pnpm docker:down         # Stop Docker services
```

## 🚀 Production Deployment

### Using Cloudflare R2 Releases

```bash
# Download latest release
autonow-fb install --version latest

# Or specific version
autonow-fb install --version 1.0.0
```

### Docker Production Setup

```bash
# Use production Docker Compose
docker-compose -f docker/docker-compose.prod.yml up -d
```

## 🛠️ Troubleshooting

Run the doctor command to diagnose issues:

```bash
autonow-fb doctor
```

Common issues:
- **Port conflicts**: Ensure ports 3000, 3001, 5432, 6379, 9000, 9200 are free
- **Docker not running**: Start Docker Desktop or Docker daemon
- **Node version**: Ensure Node.js 20+ is installed
- **Database connection**: Check PostgreSQL is running and accessible

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation](https://github.com/sherlock-126/mega_facebook#readme)
- [Issues](https://github.com/sherlock-126/mega_facebook/issues)
- [Releases](https://github.com/sherlock-126/mega_facebook/releases)
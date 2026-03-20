# AutoNow FB

Nền tảng mạng xã hội thế hệ mới với kiến trúc monorepo hiện đại.

## 🚀 Cài đặt nhanh (Khuyến nghị)

### Cách 1: Tải và cài đặt từ Cloud

```bash
# Tải và cài đặt phiên bản mới nhất
npx autonow-fb install

# Sau đó chạy setup
autonow-fb setup
```

### Cách 2: Setup tự động với CLI

```bash
# Chạy trình cài đặt tương tác
npx autonow-fb setup
```

CLI sẽ tự động:
- ✅ Kiểm tra Node.js và Docker
- ✅ Tạo file cấu hình .env
- ✅ Khởi động các dịch vụ Docker
- ✅ Chạy database migrations
- ✅ Tạo dữ liệu mẫu

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **API**: NestJS 10 + Prisma ORM + PostgreSQL 16
- **Web**: Next.js 14 + React 18 + Tailwind CSS
- **Infrastructure**: Docker Compose (PostgreSQL, Redis, MinIO, Elasticsearch)
- **CI/CD**: GitHub Actions + Cloudflare R2

## Cài đặt thủ công

### Yêu cầu hệ thống

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Các bước cài đặt

```bash
# Clone repository
git clone https://github.com/sherlock-126/mega_facebook.git
cd mega_facebook

# Cài đặt dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Khởi động infrastructure
pnpm docker:up

# Generate Prisma client
pnpm db:generate

# Chạy migrations
pnpm db:migrate

# Chạy development servers
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

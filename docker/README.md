# Docker Production Deployment Guide

## Overview

This guide provides instructions for deploying Mega Facebook using Docker in a production environment. The setup includes optimized multi-stage builds, security hardening, and production-ready configurations.

## Architecture

The production Docker setup consists of:

- **Nginx**: Reverse proxy and load balancer (ports 80/443)
- **Web**: Next.js frontend application
- **API**: NestJS backend application
- **PostgreSQL**: Primary database (v16)
- **Redis**: Caching and session storage (v7)
- **MinIO**: S3-compatible object storage
- **Elasticsearch**: Full-text search engine (v8)

## Prerequisites

- Docker Engine 24.0+ with BuildKit enabled
- Docker Compose v2.20+
- At least 4GB RAM available
- 20GB free disk space

## Quick Start (Recommended - Using CLI)

The easiest way to deploy is using our CLI tool:

```bash
# Install the CLI
npm install -g @mega/cli

# Run setup
mega-cli setup

# Start production environment
docker compose -f docker/docker-compose.prod.yml up -d
```

## Manual Setup

### 1. Clone the Repository

```bash
git clone https://github.com/sherlock-126/mega_facebook.git
cd mega_facebook
```

### 2. Configure Environment

```bash
# Copy the production environment template
cp docker/.env.prod.example docker/.env.prod

# Edit with your production values
nano docker/.env.prod
```

**Important:** Update all passwords and secrets with strong, unique values.

### 3. Build Images

```bash
# Enable BuildKit for optimized builds
export DOCKER_BUILDKIT=1

# Build all images
docker compose -f docker/docker-compose.prod.yml build
```

### 4. Start Services

```bash
# Start all services in detached mode
docker compose -f docker/docker-compose.prod.yml up -d

# Check service status
docker compose -f docker/docker-compose.prod.yml ps

# View logs
docker compose -f docker/docker-compose.prod.yml logs -f
```

### 5. Run Database Migrations

```bash
# Execute migrations in the API container
docker compose -f docker/docker-compose.prod.yml exec api npx prisma migrate deploy

# Optional: Seed initial data
docker compose -f docker/docker-compose.prod.yml exec api npm run seed
```

## Security Configuration

### SSL/TLS Setup

1. Place your SSL certificates in `docker/nginx/ssl/`:
   ```bash
   cp /path/to/cert.pem docker/nginx/ssl/
   cp /path/to/key.pem docker/nginx/ssl/
   ```

2. Uncomment the SSL server block in `docker/nginx/default.conf`

3. Update `.env.prod`:
   ```
   NGINX_HTTPS_PORT=443
   SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
   SSL_KEY_PATH=/etc/nginx/ssl/key.pem
   ```

### Security Checklist

- [ ] Changed all default passwords in `.env.prod`
- [ ] Generated strong JWT secret (min 32 characters)
- [ ] Configured firewall rules for exposed ports
- [ ] Enabled SSL/TLS certificates
- [ ] Set up regular backups
- [ ] Configured log rotation
- [ ] Implemented monitoring/alerting
- [ ] Reviewed and adjusted resource limits

## Service Management

### Starting Services

```bash
# Start all services
docker compose -f docker/docker-compose.prod.yml up -d

# Start specific service
docker compose -f docker/docker-compose.prod.yml up -d postgres redis
```

### Stopping Services

```bash
# Stop all services (data persists)
docker compose -f docker/docker-compose.prod.yml down

# Stop and remove volumes (WARNING: data loss)
docker compose -f docker/docker-compose.prod.yml down -v
```

### Scaling Services

```bash
# Scale API instances
docker compose -f docker/docker-compose.prod.yml up -d --scale api=3

# Scale Web instances
docker compose -f docker/docker-compose.prod.yml up -d --scale web=2
```

### Updating Services

```bash
# Pull latest images
docker compose -f docker/docker-compose.prod.yml pull

# Recreate containers with new images
docker compose -f docker/docker-compose.prod.yml up -d --force-recreate
```

## Monitoring & Maintenance

### Health Checks

```bash
# Check service health
docker compose -f docker/docker-compose.prod.yml ps

# Test Nginx
curl http://localhost/health

# Test API
curl http://localhost/api/health

# Check PostgreSQL
docker compose -f docker/docker-compose.prod.yml exec postgres pg_isready

# Check Redis
docker compose -f docker/docker-compose.prod.yml exec redis redis-cli ping
```

### Logs

```bash
# View all logs
docker compose -f docker/docker-compose.prod.yml logs

# Follow specific service logs
docker compose -f docker/docker-compose.prod.yml logs -f api

# Last 100 lines
docker compose -f docker/docker-compose.prod.yml logs --tail=100
```

### Database Management

```bash
# Access PostgreSQL
docker compose -f docker/docker-compose.prod.yml exec postgres psql -U mega -d mega_facebook

# Create backup
docker compose -f docker/docker-compose.prod.yml exec postgres pg_dump -U mega mega_facebook > backup.sql

# Restore backup
docker compose -f docker/docker-compose.prod.yml exec -T postgres psql -U mega mega_facebook < backup.sql
```

### Redis Management

```bash
# Access Redis CLI
docker compose -f docker/docker-compose.prod.yml exec redis redis-cli -a $REDIS_PASSWORD

# Monitor Redis
docker compose -f docker/docker-compose.prod.yml exec redis redis-cli -a $REDIS_PASSWORD monitor

# Clear cache
docker compose -f docker/docker-compose.prod.yml exec redis redis-cli -a $REDIS_PASSWORD FLUSHALL
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker compose -f docker/docker-compose.prod.yml logs <service-name>

# Inspect container
docker compose -f docker/docker-compose.prod.yml ps -a

# Check resource usage
docker stats
```

### Database Connection Issues

```bash
# Test database connection
docker compose -f docker/docker-compose.prod.yml exec api npx prisma db pull

# Reset database (WARNING: data loss)
docker compose -f docker/docker-compose.prod.yml exec api npx prisma migrate reset
```

### Port Conflicts

```bash
# Check port usage
sudo netstat -tulpn | grep -E ':(80|443|3000|3001|5432|6379|9000|9200)'

# Change ports in .env.prod
NGINX_HTTP_PORT=8080
NGINX_HTTPS_PORT=8443
```

### Memory Issues

```bash
# Check memory usage
docker stats

# Adjust memory limits in docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 1G
```

## Performance Optimization

### Image Sizes

Our multi-stage builds produce optimized images:
- API: ~150MB (Alpine + Node.js)
- Web: ~200MB (Alpine + Next.js standalone)

### Build Caching

```bash
# Build with cache
DOCKER_BUILDKIT=1 docker compose -f docker/docker-compose.prod.yml build

# Build without cache
DOCKER_BUILDKIT=1 docker compose -f docker/docker-compose.prod.yml build --no-cache
```

### Resource Limits

Adjust in `docker-compose.prod.yml`:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

## Backup & Recovery

### Automated Backups

Create a backup script:
```bash
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker compose -f docker/docker-compose.prod.yml exec -T postgres \
  pg_dump -U mega mega_facebook > $BACKUP_DIR/postgres.sql

# Backup MinIO data
docker run --rm -v minio_data:/data -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/minio.tar.gz /data

# Backup Redis
docker compose -f docker/docker-compose.prod.yml exec -T redis \
  redis-cli -a $REDIS_PASSWORD --rdb /data/backup.rdb
```

Add to crontab:
```bash
0 2 * * * /path/to/backup.sh
```

## Production Checklist

Before going live:

- [ ] SSL certificates installed and configured
- [ ] All default passwords changed
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring/alerting configured
- [ ] Log aggregation setup
- [ ] Rate limiting configured
- [ ] CORS settings reviewed
- [ ] Environment variables validated
- [ ] Health checks verified
- [ ] Load testing completed
- [ ] Security scan performed

## Support

For issues or questions:
- Check logs: `docker compose -f docker/docker-compose.prod.yml logs`
- GitHub Issues: https://github.com/yourusername/mega_facebook/issues
- Documentation: https://docs.mega-facebook.com
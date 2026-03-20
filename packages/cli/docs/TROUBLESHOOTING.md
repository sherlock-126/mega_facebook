# Troubleshooting Guide

## Common Issues and Solutions

### Installation Issues

#### npm install fails with permission errors

**Problem**: Permission denied when installing globally

**Solution**:
```bash
# Option 1: Use npx instead (no installation needed)
npx @mega/cli setup

# Option 2: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g @mega/cli

# Option 3: Use sudo (not recommended)
sudo npm install -g @mega/cli
```

#### Command not found after installation

**Problem**: `mega-cli: command not found`

**Solution**:
```bash
# Check if npm bin is in PATH
npm bin -g

# Add to PATH if needed
export PATH=$(npm bin -g):$PATH

# Or use npx
npx @mega/cli
```

### System Requirements

#### Node.js version too old

**Problem**: Node.js version < 20.0.0

**Solution**:
```bash
# Using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Using fnm
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 20
fnm use 20
```

#### Docker not installed

**Problem**: Docker command not found

**Solution**:

**macOS/Windows**:
1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Start Docker Desktop
3. Verify: `docker --version`

**Linux**:
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then verify
docker --version
```

#### Docker daemon not running

**Problem**: Cannot connect to Docker daemon

**Solution**:

**macOS/Windows**:
- Start Docker Desktop application

**Linux**:
```bash
# Start Docker service
sudo systemctl start docker

# Enable auto-start
sudo systemctl enable docker
```

### Port Conflicts

#### Port already in use

**Problem**: Port 3000/3001/5432/etc already in use

**Solution**:
```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or change ports in .env files
```

### Docker Issues

#### Services not starting

**Problem**: Docker services fail to start

**Solution**:
```bash
# Check Docker status
docker ps -a

# View logs
mega-cli logs <service>

# Reset and retry
mega-cli reset --docker
mega-cli setup
```

#### Out of disk space

**Problem**: No space left on device

**Solution**:
```bash
# Clean up Docker
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Check disk usage
docker system df
```

#### Container keeps restarting

**Problem**: Service container in restart loop

**Solution**:
```bash
# Check logs
docker logs <container-name>

# Check resource limits
docker stats

# Increase memory if needed (Docker Desktop settings)
```

### Database Issues

#### Cannot connect to database

**Problem**: Database connection refused

**Solution**:
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check connection string
cat apps/api/.env | grep DATABASE_URL

# Test connection
docker exec -it postgres psql -U postgres

# Reset database
mega-cli reset --database
```

#### Migrations fail

**Problem**: Prisma migration errors

**Solution**:
```bash
# Reset and retry
cd apps/api
pnpm prisma migrate reset
pnpm prisma migrate dev

# Or use Docker
docker compose exec api npx prisma migrate reset
```

#### Seeding fails

**Problem**: Database seeding errors

**Solution**:
```bash
# Check if database exists
docker exec postgres psql -U postgres -c "\l"

# Reset and seed
mega-cli reset --database
mega-cli seed --force
```

### MinIO/Storage Issues

#### MinIO not accessible

**Problem**: Cannot connect to MinIO

**Solution**:
```bash
# Check if MinIO is running
docker ps | grep minio

# Access MinIO console
open http://localhost:9001
# Login: minioadmin / minioadmin

# Reset MinIO
docker compose down minio
docker compose up -d minio
```

#### Bucket creation fails

**Problem**: Storage bucket errors

**Solution**:
```bash
# Manually create bucket
docker exec -it minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec -it minio mc mb local/mega-facebook
```

### Network Issues

#### Slow Docker image downloads

**Problem**: Docker pull very slow

**Solution**:
```bash
# Use mirror (China)
# Add to Docker daemon config
{
  "registry-mirrors": ["https://docker.mirrors.ustc.edu.cn"]
}

# Restart Docker
```

#### npm/pnpm install timeout

**Problem**: Package installation timeouts

**Solution**:
```bash
# Use different registry
npm config set registry https://registry.npmmirror.com

# Clear cache
npm cache clean --force
pnpm store prune
```

### Environment Issues

#### Environment variables not loaded

**Problem**: Missing or incorrect env vars

**Solution**:
```bash
# Regenerate env files
mega-cli setup --force

# Verify files exist
ls -la apps/api/.env
ls -la apps/web/.env.local

# Check values
cat apps/api/.env
```

#### Wrong environment (dev/prod)

**Problem**: Running wrong environment

**Solution**:
```bash
# For development
docker compose -f docker/docker-compose.yml up

# For production
docker compose -f docker/docker-compose.prod.yml up
```

### Permission Issues

#### File permission denied

**Problem**: Cannot read/write files

**Solution**:
```bash
# Fix ownership (Linux/macOS)
sudo chown -R $USER:$USER .

# Fix permissions
chmod -R 755 .
```

#### Docker permission denied

**Problem**: Permission denied on Docker socket

**Solution**:
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply changes (or logout/login)
newgrp docker
```

### Build Issues

#### TypeScript errors

**Problem**: TS compilation fails

**Solution**:
```bash
# Clean and rebuild
pnpm clean
pnpm build

# Generate Prisma client
pnpm db:generate
```

#### Module not found

**Problem**: Cannot find module errors

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Clear cache
pnpm store prune
```

### CLI Specific Issues

#### CLI hangs or freezes

**Problem**: CLI becomes unresponsive

**Solution**:
```bash
# Kill process
Ctrl+C

# Clear CLI config
rm -rf ~/.mega-cli

# Retry
mega-cli setup
```

#### Update check fails

**Problem**: Cannot check for updates

**Solution**:
```bash
# Skip update check
mega-cli setup --skip-update-check

# Manually update
npm update -g @mega/cli
```

## Getting Help

If you're still experiencing issues:

1. **Check logs**:
   ```bash
   mega-cli logs <service>
   docker compose logs -f
   ```

2. **Run diagnostics**:
   ```bash
   mega-cli doctor
   ```

3. **Search existing issues**:
   https://github.com/sherlock-126/mega_facebook/issues

4. **Create new issue**:
   Include:
   - Output of `mega-cli doctor`
   - Error messages
   - Steps to reproduce
   - System information

5. **Community support**:
   - GitHub Discussions
   - Stack Overflow tag: `mega-facebook`
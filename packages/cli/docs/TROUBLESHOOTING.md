# Hướng dẫn xử lý sự cố - AutoNow FB CLI

## 🔴 Lỗi thường gặp

### 1. Lỗi cài đặt từ Cloud

#### Không thể kết nối đến R2

**Triệu chứng:**
```
❌ Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.
```

**Giải pháp:**
1. Kiểm tra kết nối internet
2. Thử ping đến domain: `ping maytrix.pub.r2.dev`
3. Kiểm tra firewall/proxy có chặn kết nối không
4. Thử lại với lệnh: `autonow-fb install --force`

#### Checksum không khớp

**Triệu chứng:**
```
❌ File tải xuống bị hỏng. Vui lòng thử lại.
```

**Giải pháp:**
1. Xóa file tải xuống cũ: `rm -rf ~/.autonow-fb/artifacts`
2. Thử tải lại: `autonow-fb install --verify`
3. Nếu vẫn lỗi, tải không verify: `autonow-fb install`

### 2. Lỗi Docker

#### Docker không chạy

**Triệu chứng:**
```
❌ Docker is not running
```

**Giải pháp:**
- **macOS/Windows:** Khởi động Docker Desktop
- **Linux:**
  ```bash
  sudo systemctl start docker
  sudo systemctl enable docker
  ```

#### Xung đột port

**Triệu chứng:**
```
⚠️  Port 3000 is already in use
```

**Giải pháp:**
1. Tìm process đang dùng port:
   ```bash
   # macOS/Linux
   lsof -i :3000

   # Windows
   netstat -ano | findstr :3000
   ```

2. Dừng process hoặc đổi port trong `.env`:
   ```env
   WEB_PORT=3002
   API_PORT=3003
   ```

### 3. Lỗi Database

#### Không kết nối được PostgreSQL

**Triệu chứng:**
```
❌ Database connection failed
```

**Giải pháp:**
1. Kiểm tra container đang chạy:
   ```bash
   docker ps | grep postgres
   ```

2. Xem logs:
   ```bash
   docker logs autonow_postgres
   ```

3. Restart container:
   ```bash
   docker restart autonow_postgres
   ```

4. Nếu vẫn lỗi, reset database:
   ```bash
   autonow-fb reset --force
   autonow-fb setup
   ```

#### Migration thất bại

**Triệu chứng:**
```
❌ Failed to run migrations
```

**Giải pháp:**
1. Kiểm tra DATABASE_URL trong `.env`
2. Reset migrations:
   ```bash
   cd apps/api
   npx prisma migrate reset --force
   npx prisma migrate deploy
   ```

### 4. Lỗi MinIO/Storage

#### MinIO không khởi động

**Triệu chứng:**
```
❌ MinIO connection failed
```

**Giải pháp:**
1. MinIO mất thời gian khởi động, đợi 30s
2. Kiểm tra logs:
   ```bash
   docker logs autonow_minio
   ```

3. Truy cập console: http://localhost:9001
   - User: minioadmin
   - Pass: minioadmin

### 5. Lỗi Node.js

#### Phiên bản Node.js không đúng

**Triệu chứng:**
```
❌ Node.js version 20.0.0 or higher is required
```

**Giải pháp:**
1. Cài Node.js 20+:
   - Dùng [nvm](https://github.com/nvm-sh/nvm):
     ```bash
     nvm install 20
     nvm use 20
     ```
   - Hoặc tải từ [nodejs.org](https://nodejs.org)

### 6. Lỗi quyền (Permissions)

#### Lỗi EACCES

**Triệu chứng:**
```
❌ EACCES: permission denied
```

**Giải pháp:**
1. **npm global install:** Cấu hình npm prefix:
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

2. **Docker permissions (Linux):**
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

## 💡 Mẹo khắc phục nhanh

### Reset hoàn toàn

Nếu gặp lỗi không xác định, reset tất cả:
```bash
# Dừng và xóa tất cả
autonow-fb reset --force

# Xóa cache npm
npm cache clean --force

# Cài đặt lại
autonow-fb install --force
autonow-fb setup
```

### Chế độ Debug

Bật chế độ debug để xem chi tiết lỗi:
```bash
DEBUG=* autonow-fb doctor
```

### Kiểm tra sức khỏe hệ thống

```bash
autonow-fb doctor
```

Lệnh này sẽ kiểm tra:
- ✅ Node.js version
- ✅ Docker status
- ✅ Port availability
- ✅ Environment files
- ✅ Database connection
- ✅ Storage connection

## 📞 Hỗ trợ

Nếu vẫn gặp lỗi:

1. **Tạo issue trên GitHub:**
   https://github.com/sherlock-126/mega_facebook/issues

2. **Cung cấp thông tin:**
   - Output của `autonow-fb doctor`
   - Hệ điều hành (macOS/Linux/Windows)
   - Phiên bản Node.js: `node --version`
   - Phiên bản Docker: `docker --version`
   - Log lỗi đầy đủ

3. **Tham gia cộng đồng:**
   - Discord: [Coming soon]
   - Telegram: [Coming soon]

## 🔧 Công cụ hữu ích

### Docker cleanup

```bash
# Xóa containers stopped
docker container prune

# Xóa images không dùng
docker image prune -a

# Xóa volumes không dùng
docker volume prune

# Xóa tất cả (cẩn thận!)
docker system prune -a --volumes
```

### Port management

```bash
# Kill process on port
kill -9 $(lsof -t -i:3000)

# List all ports in use
netstat -tulpn | grep LISTEN
```

### Logs

```bash
# Xem logs của service cụ thể
autonow-fb logs api
autonow-fb logs web

# Tail logs
docker logs -f autonow_postgres
docker logs -f autonow_redis
```
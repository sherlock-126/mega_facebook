# autonow-fb

Công cụ CLI tương tác để cài đặt và quản lý nền tảng AutoNow FB.

## Tính năng

- 🚀 **Cài đặt tự động** - Hướng dẫn cài đặt với giao diện đẹp
- 🔍 **Kiểm tra hệ thống** - Xác thực Node.js và Docker
- 📝 **Cấu hình môi trường** - Tự động tạo file `.env`
- 🐳 **Quản lý Docker** - Khởi động và quản lý các dịch vụ Docker
- 🗄️ **Thiết lập Database** - Chạy migrations và tạo dữ liệu mẫu
- 📦 **Cấu hình Storage** - Thiết lập MinIO buckets
- 🩺 **Kiểm tra sức khỏe** - Chẩn đoán vấn đề với lệnh `doctor`
- 🔄 **Reset môi trường** - Xóa sạch dữ liệu và cài lại
- ☁️ **Tải từ Cloud** - Tải và cài đặt từ Cloudflare R2

## Cài đặt

### Cách 1: Cài đặt nhanh từ Cloud (Khuyến nghị)

```bash
# Tải và cài đặt phiên bản mới nhất
npx autonow-fb install

# Hoặc cài đặt phiên bản cụ thể
npx autonow-fb install --version 1.0.0
```

### Cách 2: Chạy trực tiếp từ npm

```bash
# Chạy trình cài đặt
npx autonow-fb setup
```

### Cách 3: Cài đặt global

```bash
# Cài đặt global
npm install -g autonow-fb

# Sau đó chạy
autonow-fb setup
```

## Các lệnh

### `setup` (mặc định)

Hướng dẫn cài đặt tương tác từng bước:

```bash
npx autonow-fb setup
```

Trình cài đặt sẽ:
1. Kiểm tra phiên bản Node.js (≥20.0.0) và Docker
2. Tạo file môi trường từ template
3. Khởi động các dịch vụ Docker (PostgreSQL, Redis, MinIO, Elasticsearch)
4. Chạy database migrations
5. Tạo MinIO storage bucket
6. Tùy chọn tạo dữ liệu mẫu

### `install`

Tải và cài đặt AutoNow FB từ Cloud:

```bash
npx autonow-fb install [options]
```

Tùy chọn:
- `--version <version>` - Cài đặt phiên bản cụ thể
- `--force` - Ghi đè cài đặt hiện tại
- `--dry-run` - Kiểm tra mà không cài đặt
- `--verify` - Xác minh checksum

### `update`

Kiểm tra và cập nhật phiên bản mới:

```bash
npx autonow-fb update
```

### `doctor`

Kiểm tra sức khỏe hệ thống AutoNow FB:

```bash
npx autonow-fb doctor
```

Báo cáo trạng thái:
- Yêu cầu hệ thống (Node.js, Docker, ports)
- Cấu hình môi trường
- Sức khỏe dịch vụ Docker
- Kết nối database và migrations
- Kết nối MinIO storage

### `reset`

Reset môi trường về trạng thái ban đầu:

```bash
npx autonow-fb reset
```

Lệnh này sẽ:
- Dừng tất cả dịch vụ Docker
- Xóa Docker volumes (xóa toàn bộ dữ liệu)
- Tùy chọn chạy lại quá trình cài đặt

Dùng `--force` để bỏ qua xác nhận:

```bash
npx autonow-fb reset --force
```

### `start`

Khởi động tất cả dịch vụ:

```bash
npx autonow-fb start
```

### `stop`

Dừng tất cả dịch vụ:

```bash
npx autonow-fb stop
```

### `logs`

Xem logs của dịch vụ:

```bash
npx autonow-fb logs [service]
```

### `seed`

Tạo dữ liệu mẫu:

```bash
npx autonow-fb seed [options]
```

Tùy chọn:
- `--admin-only` - Chỉ tạo tài khoản admin
- `--full` - Tạo toàn bộ dữ liệu demo
- `--force` - Ghi đè dữ liệu hiện có

## Phát triển

Để phát triển CLI:

```bash
# Cài đặt dependencies
pnpm install

# Build CLI
pnpm --filter autonow-fb build

# Chế độ phát triển
pnpm --filter autonow-fb dev
```

## Yêu cầu hệ thống

- Node.js ≥ 20.0.0
- Docker & Docker Compose
- Các port khả dụng:
  - 3000 (Web app)
  - 3001 (API server)
  - 5432 (PostgreSQL)
  - 6379 (Redis)
  - 9000 (MinIO)
  - 9001 (MinIO Console)
  - 9200 (Elasticsearch)

## Xử lý sự cố

### Xung đột Port

Nếu gặp cảnh báo xung đột port, dừng các dịch vụ khác đang dùng port đó hoặc sửa cấu hình port trong file `.env`.

### Lỗi kết nối Docker

Đảm bảo Docker Desktop hoặc Docker Engine đang chạy:

```bash
docker info
```

### Lỗi kết nối Database

Kiểm tra PostgreSQL container:

```bash
docker ps
docker logs autonow_postgres
```

### Lỗi kết nối MinIO

MinIO có thể mất thời gian khởi động. Kiểm tra trạng thái:

```bash
docker logs autonow_minio
```

### Lỗi tải từ Cloud

Nếu không thể tải từ R2:
- Kiểm tra kết nối internet
- Thử lại với `--force` flag
- Liên hệ support nếu lỗi tiếp tục

## License

MIT - AutoNow FB Team
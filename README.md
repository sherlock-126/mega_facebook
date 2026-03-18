# Mega Facebook

Mạng xã hội hiện đại được xây dựng với công nghệ tiên tiến nhất, hướng tới cộng đồng người dùng Việt Nam.

## Tính năng chính

- **Đăng ký & Đăng nhập** — Xác thực an toàn bằng email/mật khẩu, JWT
- **Hồ sơ cá nhân** — Ảnh đại diện, ảnh bìa, thông tin cá nhân
- **Bài viết** — Đăng, chỉnh sửa, xóa bài viết có văn bản và hình ảnh
- **Bảng tin (News Feed)** — Cá nhân hóa theo bạn bè và mức độ tương tác
- **Phản ứng & Bình luận** — Like, love, haha, wow, sad, angry + bình luận lồng nhau
- **Bạn bè** — Tìm kiếm, gửi/chấp nhận lời mời kết bạn
- **Nhắn tin** — Chat thời gian thực 1-1 qua WebSocket
- **Thông báo** — Thông báo đẩy cho tương tác, tin nhắn, lời mời
- **Tìm kiếm** — Tìm người dùng và bài viết theo từ khóa

## Công nghệ

| Lớp | Công nghệ |
|---|---|
| Frontend | React 18+, TypeScript, Next.js, Tailwind CSS |
| Backend | Node.js, NestJS, GraphQL (Apollo), REST |
| Database | PostgreSQL, Redis, Elasticsearch |
| Real-time | Socket.IO / WebSocket |
| Storage | S3/MinIO, CDN |
| Hạ tầng | Docker, Kubernetes, GitHub Actions, Nginx |
| Giám sát | Prometheus, Grafana, ELK Stack |

## Cài đặt

### Yêu cầu
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16
- Redis 7

### Khởi chạy môi trường phát triển

```bash
# Clone repository
git clone <repo-url>
cd mega_facebook

# Cài đặt dependencies
npm install

# Khởi chạy infrastructure (database, redis, elasticsearch)
docker-compose up -d

# Chạy migration
npm run db:migrate

# Khởi chạy ứng dụng
npm run dev
```

> Chi tiết cài đặt sẽ được cập nhật khi codebase được phát triển.

## Cấu trúc dự án

```
mega_facebook/
├── apps/
│   ├── web/            # Frontend (Next.js)
│   └── api/            # Backend (NestJS)
├── packages/
│   ├── shared/         # Types & constants dùng chung
│   └── ui/             # UI components dùng chung
├── infra/              # Docker, K8s, Terraform
├── docs/               # Tài liệu dự án
│   ├── PRD.md          # Yêu cầu sản phẩm
│   └── ARCHITECTURE.md # Kiến trúc hệ thống
└── README.md
```

> Cấu trúc sẽ được cập nhật khi dự án phát triển.

## Tài liệu

- [Yêu cầu sản phẩm (PRD)](docs/PRD.md)
- [Kiến trúc hệ thống](docs/ARCHITECTURE.md)

## Đóng góp

1. Fork repository
2. Tạo branch tính năng (`git checkout -b feature/ten-tinh-nang`)
3. Commit thay đổi (`git commit -m 'Thêm tính năng mới'`)
4. Push lên branch (`git push origin feature/ten-tinh-nang`)
5. Tạo Pull Request

Vui lòng đọc tài liệu kiến trúc trước khi đóng góp để đảm bảo tuân thủ các quy ước của dự án.

## Giấy phép

Giấy phép sẽ được xác định sau. (TBD)

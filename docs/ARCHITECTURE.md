# Kiến trúc Hệ thống — Mega Facebook

## 1. Tổng quan hệ thống

Mega Facebook sử dụng kiến trúc microservices, tách biệt frontend và backend, giao tiếp qua API (GraphQL/REST) và WebSocket cho tính năng thời gian thực. Hệ thống được thiết kế để mở rộng theo chiều ngang và triển khai trên container.

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Client     │────▶│   CDN/Nginx  │────▶│   Load Balancer  │
│  (Browser)   │     │              │     │                  │
└─────────────┘     └──────────────┘     └────────┬─────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────┐
                    │                              │                      │
              ┌─────▼─────┐  ┌─────────────┐  ┌───▼───────┐  ┌─────────▼───┐
              │ API Gateway│  │  Auth Service│  │ Feed Svc  │  │ Message Svc │
              │ (GraphQL)  │  │  (JWT)       │  │           │  │ (WebSocket) │
              └─────┬──────┘  └──────┬──────┘  └─────┬─────┘  └──────┬──────┘
                    │                │                │               │
              ┌─────▼────────────────▼────────────────▼───────────────▼──────┐
              │                    Database Layer                             │
              │  ┌────────────┐  ┌─────────┐  ┌──────────────┐              │
              │  │ PostgreSQL │  │  Redis   │  │Elasticsearch │              │
              │  └────────────┘  └─────────┘  └──────────────┘              │
              └──────────────────────────────────────────────────────────────┘
```

## 2. Công nghệ sử dụng (Tech Stack)

### Frontend
| Công nghệ | Mục đích |
|---|---|
| **React 18+** | Thư viện UI chính với concurrent features |
| **TypeScript** | Type safety cho toàn bộ codebase |
| **Next.js 14+** | SSR/SSG, routing, API routes |
| **Tailwind CSS** | Styling nhanh, responsive design |
| **Socket.IO Client** | Kết nối WebSocket cho real-time |
| **Apollo Client** | GraphQL state management |
| **React Query** | Server state caching và synchronization |

### Backend
| Công nghệ | Mục đích |
|---|---|
| **Node.js 20+** | Runtime chính |
| **NestJS** | Framework backend có cấu trúc, hỗ trợ DI |
| **GraphQL (Apollo Server)** | API chính cho queries phức tạp |
| **REST API** | API đơn giản (auth, upload, health check) |
| **Socket.IO** | Real-time server cho messaging/notifications |
| **Bull/BullMQ** | Job queue cho background tasks |

### Cơ sở dữ liệu & Lưu trữ
| Công nghệ | Mục đích |
|---|---|
| **PostgreSQL 16** | Database chính (quan hệ) |
| **Redis 7** | Caching, session store, pub/sub |
| **Elasticsearch 8** | Full-text search (người dùng, bài viết) |
| **S3 / MinIO** | Lưu trữ file (ảnh, video) |
| **CDN (CloudFront)** | Phân phối nội dung tĩnh |

### Hạ tầng & DevOps
| Công nghệ | Mục đích |
|---|---|
| **Docker** | Container hóa tất cả services |
| **Kubernetes** | Orchestration và auto-scaling |
| **GitHub Actions** | CI/CD pipeline |
| **Nginx** | Reverse proxy, SSL termination |
| **Terraform** | Infrastructure as Code |

### Giám sát & Logging
| Công nghệ | Mục đích |
|---|---|
| **Prometheus** | Thu thập metrics |
| **Grafana** | Dashboard và alerting |
| **ELK Stack** | Centralized logging (Elasticsearch, Logstash, Kibana) |
| **Sentry** | Error tracking |

## 3. Mô hình dữ liệu

### Các thực thể chính

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     User     │       │     Post     │       │   Comment    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (UUID)    │──┐    │ id (UUID)    │──┐    │ id (UUID)    │
│ email        │  │    │ author_id    │  │    │ post_id      │
│ password_hash│  │    │ content      │  │    │ author_id    │
│ display_name │  │    │ media_urls[] │  │    │ parent_id    │
│ avatar_url   │  │    │ visibility   │  │    │ content      │
│ cover_url    │  │    │ created_at   │  │    │ created_at   │
│ bio          │  │    │ updated_at   │  │    └──────────────┘
│ location     │  │    └──────────────┘  │
│ created_at   │  │                      │
└──────────────┘  │    ┌──────────────┐  │    ┌──────────────┐
                  │    │   Reaction   │  │    │  Friendship  │
                  │    ├──────────────┤  │    ├──────────────┤
                  │    │ id (UUID)    │  │    │ id (UUID)    │
                  ├───▶│ user_id      │  │    │ requester_id │
                  │    │ target_id    │◀─┘    │ addressee_id │
                  │    │ target_type  │       │ status       │
                  │    │ type (enum)  │       │ created_at   │
                  │    └──────────────┘       └──────────────┘
                  │
                  │    ┌──────────────┐       ┌──────────────┐
                  │    │   Message    │       │ Notification │
                  │    ├──────────────┤       ├──────────────┤
                  │    │ id (UUID)    │       │ id (UUID)    │
                  ├───▶│ sender_id    │       │ user_id      │
                  │    │ receiver_id  │       │ type (enum)  │
                  │    │ content      │       │ reference_id │
                  │    │ read_at      │       │ is_read      │
                  │    │ created_at   │       │ content      │
                  │    └──────────────┘       │ created_at   │
                  │                           └──────────────┘
                  │    ┌──────────────┐
                  │    │    Group     │
                  │    ├──────────────┤
                  │    │ id (UUID)    │
                  └───▶│ creator_id   │
                       │ name         │
                       │ description  │
                       │ avatar_url   │
                       │ privacy      │
                       │ created_at   │
                       └──────────────┘
```

### Quan hệ chính
- **User → Post:** 1:N (một người dùng có nhiều bài viết)
- **User → Comment:** 1:N
- **Post → Comment:** 1:N (hỗ trợ nested comments qua `parent_id`)
- **User → Reaction → Post/Comment:** N:M (polymorphic)
- **User → Friendship → User:** N:M (quan hệ đối xứng)
- **User → Message → User:** N:M
- **User → Notification:** 1:N
- **User → Group:** N:M (qua bảng trung gian `GroupMember`)

## 4. Luồng dữ liệu

### Luồng yêu cầu API (Request Lifecycle)

```
Client → CDN/Nginx → Load Balancer → API Gateway
  → Auth Middleware (xác thực JWT)
  → Route Handler (GraphQL resolver / REST controller)
  → Service Layer (business logic)
  → Repository Layer (database query)
  → Response → Client
```

### Luồng sự kiện thời gian thực (Real-time Event Flow)

```
1. Người dùng A gửi tin nhắn → WebSocket Server
2. Server lưu tin nhắn vào PostgreSQL
3. Server publish event lên Redis Pub/Sub
4. Tất cả WebSocket Server instances nhận event
5. Server tìm connection của người dùng B
6. Gửi tin nhắn tới người dùng B qua WebSocket
7. Tạo notification nếu B offline
```

### Luồng tạo bài viết

```
1. Client gửi bài viết (text + media)
2. Media upload → S3/MinIO → trả về URL
3. Tạo bản ghi Post trong PostgreSQL
4. Index bài viết vào Elasticsearch
5. Invalidate feed cache trong Redis
6. Push notification cho bạn bè (qua job queue)
```

## 5. Bảo mật

### Xác thực & Phân quyền
- **JWT Access Token** (thời hạn 15 phút) + **Refresh Token** (thời hạn 7 ngày)
- Refresh token lưu trong httpOnly cookie
- Role-based access control (RBAC) cho admin features

### Bảo vệ API
- **Rate Limiting:** Giới hạn số request theo IP và user (100 req/phút cho API chung, 10 req/phút cho auth)
- **Input Validation:** Sử dụng class-validator (NestJS) cho tất cả input
- **CORS:** Chỉ cho phép origin từ domain chính thức
- **Helmet:** HTTP security headers

### Bảo vệ dữ liệu
- Mật khẩu hash bằng bcrypt (salt rounds: 12)
- Mã hóa dữ liệu nhạy cảm (PII) tại rest
- HTTPS/TLS cho tất cả kết nối
- SQL injection prevention qua ORM (TypeORM/Prisma)
- XSS prevention qua sanitization

## 6. Khả năng mở rộng

### Mở rộng theo chiều ngang
- Stateless API servers → dễ dàng thêm instances
- Kubernetes HPA (Horizontal Pod Autoscaler) dựa trên CPU/memory
- Database read replicas cho read-heavy workload

### Caching Strategy
- **CDN:** Static assets, media files
- **Redis L1:** Session data, feed cache, online status
- **Application Cache:** Frequently accessed queries (user profiles)
- Cache invalidation qua event-driven approach

### Database Scaling
- **Connection Pooling:** PgBouncer
- **Read Replicas:** Tách read/write traffic
- **Partitioning:** Bảng Message và Notification theo thời gian
- **Sharding:** Chuẩn bị chiến lược sharding theo user_id cho giai đoạn sau

### Message Queue
- BullMQ cho background jobs: email, push notification, feed generation
- Tách biệt worker processes khỏi API servers

## 7. Cấu trúc thư mục đề xuất

```
mega_facebook/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── pages/          # Next.js pages/routes
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # Utilities, API client
│   │   │   ├── stores/         # State management
│   │   │   └── styles/         # Global styles
│   │   ├── public/             # Static assets
│   │   └── package.json
│   │
│   └── api/                    # NestJS backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/       # Authentication module
│       │   │   ├── users/      # User management
│       │   │   ├── posts/      # Posts & feed
│       │   │   ├── comments/   # Comments
│       │   │   ├── reactions/  # Reactions
│       │   │   ├── friends/    # Friendship management
│       │   │   ├── messages/   # Real-time messaging
│       │   │   ├── notifications/ # Notifications
│       │   │   └── search/     # Search functionality
│       │   ├── common/         # Shared guards, filters, pipes
│       │   ├── config/         # Configuration
│       │   └── database/       # Migrations, seeds
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared types, constants
│   └── ui/                     # Shared UI components
│
├── infra/
│   ├── docker/                 # Dockerfiles
│   ├── k8s/                    # Kubernetes manifests
│   └── terraform/              # IaC definitions
│
├── docs/                       # Documentation
├── docker-compose.yml          # Local development
├── turbo.json                  # Turborepo config
├── package.json                # Root package.json
└── README.md
```

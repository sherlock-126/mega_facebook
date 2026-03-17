# Phân tích Codebase & Backlog cho Mega Facebook

## 1. Hiện trạng Codebase

Repository hiện tại chứa một CLI tool viết bằng Go cho Facebook automation qua AdsPower:
- `cmd/` — Cobra CLI commands (profile management)
- `internal/adspower/` — AdsPower Local API client
- Go modules: go-rod (browser automation), cobra (CLI)

**Nhận xét:** Codebase hiện tại là tool automation, không phải nền tảng mạng xã hội. Dự án Mega Facebook sẽ được xây dựng mới hoàn toàn với tech stack khác (NestJS + Next.js + PostgreSQL).

## 2. Phân tích Epics

### Epic 0: Nền tảng Dự án (Project Foundation) — P0
- **8 stories** (F-01 → F-08)
- Prerequisite cho tất cả epic khác
- Bao gồm: Monorepo, Docker, NestJS, Next.js, DB migrations, CI/CD, Media upload, Shared packages

### Epic 1: Identity & Access Management (IAM) — P0
- **7 stories** (IAM-01 → IAM-07)
- Covers: US-01 → US-05 (Register, Login, Password Reset, Profile, Avatar)
- Bao gồm cả Auth Guards (IAM-07) — shared dependency cho authenticated endpoints

### Epic 2: Social Graph & Networking — P1
- **5 stories** (SG-01 → SG-05)
- Covers: US-11, US-12, US-16 (Friends, Block, User Search)
- SG-04 xử lý phần user search của US-16 bằng PostgreSQL ILIKE (trước Elasticsearch)

### Epic 3: Content & Interaction System — P1
- **10 stories** (CT-01 → CT-10)
- Covers: US-06 → US-10, US-16 (Posts, Feed, Reactions, Comments, Search)
- CT-09 xử lý full-text search với Elasticsearch
- CT-04 (algorithmic feed) là P2 enhancement

### Epic 4: Real-time Communication & Notifications — P2
- **6 stories** (RT-01 → RT-06)
- Covers: US-13 → US-15 (Messages, Online Status, Notifications)
- WebSocket/Socket.IO infrastructure

## 3. Coverage Analysis

### PRD User Stories → Epic Mapping

| US | Mô tả | Epic | Story |
|----|--------|------|-------|
| US-01 | Đăng ký | IAM | IAM-01 |
| US-02 | Đăng nhập | IAM | IAM-02 |
| US-03 | Quên mật khẩu | IAM | IAM-03 |
| US-04 | Hồ sơ cá nhân | IAM | IAM-04, IAM-06 |
| US-05 | Ảnh đại diện/bìa | IAM | IAM-05 |
| US-06 | Tạo bài viết | Content | CT-01 |
| US-07 | Newsfeed | Content | CT-03, CT-04 |
| US-08 | Sửa/xóa bài | Content | CT-02 |
| US-09 | Reactions | Content | CT-05, CT-08 |
| US-10 | Bình luận | Content | CT-06, CT-07 |
| US-11 | Kết bạn | Social Graph | SG-01, SG-03, SG-04 |
| US-12 | Chấp nhận/từ chối | Social Graph | SG-02, SG-03 |
| US-13 | Nhắn tin | Real-time | RT-02, RT-03 |
| US-14 | Online status | Real-time | RT-04 |
| US-15 | Thông báo | Real-time | RT-05, RT-06 |
| US-16 | Tìm kiếm | Social Graph + Content | SG-04, CT-09 |

**Coverage: 16/16 User Stories (100%)**

### Gaps đã xử lý
1. **Foundation Epic (mới):** Thêm Epic 0 với 8 stories cho infrastructure — monorepo, Docker, DB, CI/CD
2. **US-16 Search:** Tách thành SG-04 (user search, PostgreSQL) + CT-09 (full-text search, Elasticsearch)
3. **Media Upload:** Trích xuất thành F-07 shared service, dùng chung cho IAM-05 và CT-01

## 4. Phân bổ Phases

| Phase | Sprint | Stories | Mục tiêu |
|-------|--------|---------|----------|
| 1 | 1 | F-01, F-02, F-08 | Monorepo + Docker + Shared packages |
| 2 | 2 | F-03, F-04, F-05 | NestJS + Next.js + DB migrations |
| 3 | 3 | IAM-01→03, IAM-07 | Auth system hoàn chỉnh |
| 4 | 4-5 | IAM-04→06, F-07, SG-01→04 | Profile + Media + Social Graph |
| 5 | 5-6 | CT-01→03, CT-05→07 | Core content & interactions |
| 6 | 7-8 | RT-01→06, CT-04, CT-08→10, SG-05, F-06 | Real-time + enhancements + CI/CD |

**Tổng: 36 stories, ~8 sprints**

## 5. Kết luận

- 5 Epics cover đầy đủ 16 User Stories trong PRD
- Foundation Epic (P0) là prerequisite bắt buộc
- Dependency chain rõ ràng: Foundation → IAM → Social Graph/Content → Real-time
- Backlog đã được tạo đầy đủ trong hệ thống VibeDev

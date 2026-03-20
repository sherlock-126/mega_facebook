# Gộp Backlog: 14 Stories Lớn

## Tóm tắt
Gộp 36 stories nhỏ + cancel 11 stories trùng lặp → giữ lại đúng 14 stories lớn đã thống nhất.
Tổng cộng 47 stories đã được cancel, 14 stories giữ lại.

## 14 Stories Giữ Lại

### Nền tảng Dự án (Foundation) — 3 stories
| # | ID | Tên | Priority |
|---|-----|------|----------|
| 1 | Found-01 | Monorepo Core & Infrastructure Setup | P0 |
| 2 | Found-02 | Fullstack Scaffolding & Shared Libraries | P0 |
| 3 | Found-03 | Database Services & Media Storage | P0 |

### Identity & Access Management (IAM) — 3 stories
| # | ID | Tên | Priority |
|---|-----|------|----------|
| 4 | IAM-01 | Core Authentication & Security System | P0 |
| 5 | IAM-02 | User Profile & Media Management | P1 |
| 6 | IAM-03 | Profile Frontend & Interface Implementation | P1 |

### Social Graph & Networking — 2 stories
| # | ID | Tên | Priority |
|---|-----|------|----------|
| 7 | SG-01 | Friendship Lifecycle & User Discovery System | P1 |
| 8 | SG-02 | User Privacy & Blocking | P1 |

### Content & Interaction System — 3 stories
| # | ID | Tên | Priority |
|---|-----|------|----------|
| 9 | Content-01 | Post Lifecycle & Newsfeed Engine | P1 |
| 10 | Content-02 | Engagement System (Reactions & Comments) | P1 |
| 11 | Content-03 | Global Search Integration (Elasticsearch) | P1 |

### Real-time Communication & Notifications — 3 stories
| # | ID | Tên | Priority |
|---|-----|------|----------|
| 12 | RT-01 | Real-time Messaging Infrastructure & Core DMs | P1 |
| 13 | RT-02 | Presence System & Interaction Indicators | P2 |
| 14 | RT-03 | Notification Center & History Management | P2 |

## Mapping: Stories nhỏ → Stories lớn
- **Found-01** ← F-01 (Monorepo), F-02 (Docker)
- **Found-02** ← F-03 (NestJS), F-04 (Next.js), F-08 (Shared packages)
- **Found-03** ← F-05 (DB migrations), F-06 (CI/CD), F-07 (Media upload)
- **IAM-01** ← IAM-01 (Đăng ký), IAM-02 (Đăng nhập JWT), IAM-03 (Password reset), IAM-07 (Auth Guards)
- **IAM-02** ← IAM-04 (Profile CRUD), IAM-05 (Avatar/Cover upload)
- **IAM-03** ← IAM-06 (Profile Page frontend)
- **SG-01** ← SG-01 (Friend request), SG-02 (Accept/Reject), SG-03 (Friend list), SG-04 (User search)
- **SG-02** ← SG-05 (Block user)
- **Content-01** ← CT-01 (Tạo post), CT-02 (Edit/Delete), CT-03 (Newsfeed), CT-04 (Ranking)
- **Content-02** ← CT-05 (Reactions), CT-06 (Comments), CT-07 (Nested comments), CT-08 (Comment reactions), CT-10 (Post detail)
- **Content-03** ← CT-09 (Elasticsearch search)
- **RT-01** ← RT-01 (WebSocket), RT-02 (DMs), RT-03 (Conversation history)
- **RT-02** ← RT-04 (Online/Offline presence)
- **RT-03** ← RT-05 (Notifications), RT-06 (Read/manage notifications)

## 47 Stories Đã Cancel
- 8 stories Foundation nhỏ (F-01 → F-08) + 1 duplicate Found-03
- 7 stories IAM nhỏ (IAM-01→07) + 2 duplicates (IAM-02, IAM-03)
- 4 stories Social Graph nhỏ (SG-01→05) + 2 duplicates (SG-01, SG-02)
- 10 stories Content nhỏ (CT-01→10) + 2 duplicates (Content-01, Content-02, Content-03)
- 6 stories Real-time nhỏ (RT-01→06) + 3 duplicates (RT-01, RT-02, RT-03)

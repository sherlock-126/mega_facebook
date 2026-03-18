# Tài liệu Yêu cầu Sản phẩm (PRD) — Mega Facebook

## 1. Tầm nhìn

Mega Facebook là một mạng xã hội hiện đại, được xây dựng từ đầu với công nghệ tiên tiến nhất. Mục tiêu là tạo ra một nền tảng kết nối cộng đồng người dùng Việt Nam, cho phép chia sẻ nội dung, tương tác và giao tiếp trong thời gian thực.

## 2. Mục tiêu

### Mục tiêu MVP (Phase 1)
- Xây dựng hệ thống đăng ký và đăng nhập an toàn
- Cho phép người dùng tạo và quản lý hồ sơ cá nhân
- Hỗ trợ đăng bài viết (văn bản, hình ảnh)
- Hiển thị bảng tin (News Feed) cá nhân hóa
- Hệ thống bạn bè (gửi/chấp nhận lời mời)
- Tương tác bài viết (thích, bình luận)
- Nhắn tin trực tiếp giữa người dùng
- Hệ thống thông báo cơ bản

### Mục tiêu dài hạn
- Nhóm (Groups) và trang (Pages)
- Video trực tiếp (Live streaming)
- Marketplace
- Quảng cáo và phân tích

## 3. Phạm vi

### Trong phạm vi MVP
- Xác thực người dùng (email, mật khẩu)
- Hồ sơ cá nhân (ảnh đại diện, ảnh bìa, thông tin cơ bản)
- Bài viết (tạo, sửa, xóa, chia sẻ)
- Bảng tin theo thuật toán đơn giản
- Hệ thống bạn bè
- Bình luận và phản ứng (reactions)
- Nhắn tin 1-1
- Thông báo đẩy
- Tìm kiếm người dùng và bài viết

### Ngoài phạm vi MVP
- Nhóm, trang, sự kiện
- Video/audio call
- Stories
- Marketplace
- Quảng cáo
- Đăng nhập bằng bên thứ ba (OAuth)

## 4. Câu chuyện người dùng

### Đăng ký & Đăng nhập
1. **US-01:** Là người dùng mới, tôi muốn đăng ký tài khoản bằng email và mật khẩu để tham gia mạng xã hội.
2. **US-02:** Là người dùng đã đăng ký, tôi muốn đăng nhập vào tài khoản để truy cập nền tảng.
3. **US-03:** Là người dùng, tôi muốn đặt lại mật khẩu khi quên để khôi phục quyền truy cập.

### Hồ sơ cá nhân
4. **US-04:** Là người dùng, tôi muốn cập nhật thông tin cá nhân (tên, tiểu sử, nơi ở) để người khác hiểu hơn về tôi.
5. **US-05:** Là người dùng, tôi muốn tải lên ảnh đại diện và ảnh bìa để cá nhân hóa hồ sơ.

### Bài viết & Bảng tin
6. **US-06:** Là người dùng, tôi muốn đăng bài viết có văn bản và hình ảnh để chia sẻ với bạn bè.
7. **US-07:** Là người dùng, tôi muốn xem bảng tin với bài viết từ bạn bè, sắp xếp theo thời gian và mức độ tương tác.
8. **US-08:** Là người dùng, tôi muốn chỉnh sửa hoặc xóa bài viết của mình.

### Tương tác
9. **US-09:** Là người dùng, tôi muốn thả biểu tượng cảm xúc (like, love, haha, wow, sad, angry) trên bài viết.
10. **US-10:** Là người dùng, tôi muốn bình luận trên bài viết và trả lời bình luận của người khác.

### Bạn bè
11. **US-11:** Là người dùng, tôi muốn tìm kiếm và gửi lời mời kết bạn.
12. **US-12:** Là người dùng, tôi muốn chấp nhận hoặc từ chối lời mời kết bạn.

### Nhắn tin
13. **US-13:** Là người dùng, tôi muốn gửi tin nhắn văn bản trực tiếp cho bạn bè trong thời gian thực.
14. **US-14:** Là người dùng, tôi muốn xem trạng thái online/offline của bạn bè.

### Thông báo & Tìm kiếm
15. **US-15:** Là người dùng, tôi muốn nhận thông báo khi có người tương tác với bài viết, gửi lời mời kết bạn hoặc nhắn tin.
16. **US-16:** Là người dùng, tôi muốn tìm kiếm người dùng khác và bài viết theo từ khóa.

## 5. Yêu cầu phi chức năng

### Hiệu suất
- Thời gian tải trang < 2 giây
- API phản hồi < 200ms (p95)
- Hỗ trợ tối thiểu 10.000 người dùng đồng thời trong MVP

### Bảo mật
- Mã hóa mật khẩu bằng bcrypt
- Xác thực bằng JWT với refresh token
- Bảo vệ chống CSRF, XSS, SQL Injection
- Rate limiting trên tất cả API endpoints
- Mã hóa dữ liệu truyền tải (HTTPS/TLS)

### Khả năng mở rộng
- Kiến trúc microservices cho phép mở rộng theo chiều ngang
- Database sharding khi cần thiết
- Caching đa tầng (CDN, Redis, application cache)

### Khả dụng
- Uptime mục tiêu: 99.9%
- Graceful degradation khi service gặp sự cố
- Health check và auto-recovery

## 6. Rủi ro và giảm thiểu

| Rủi ro | Mức độ | Giảm thiểu |
|---|---|---|
| Quá tải hệ thống khi người dùng tăng nhanh | Cao | Thiết kế horizontal scaling từ đầu, load testing định kỳ |
| Rò rỉ dữ liệu người dùng | Cao | Mã hóa dữ liệu, audit log, penetration testing |
| Nội dung vi phạm (spam, bạo lực) | Trung bình | Hệ thống báo cáo, bộ lọc nội dung cơ bản |
| Phụ thuộc vào dịch vụ bên thứ ba | Trung bình | Thiết kế abstraction layer, fallback mechanisms |
| Scope creep — phạm vi mở rộng ngoài kế hoạch | Trung bình | Tuân thủ nghiêm ngặt phạm vi MVP, review sprint |
| Hiệu suất real-time messaging kém | Trung bình | Sử dụng WebSocket, tối ưu hóa message queue |

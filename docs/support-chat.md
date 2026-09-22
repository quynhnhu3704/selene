# Chat chăm sóc khách hàng

Khách hàng mở `/ho-tro` sau khi đăng nhập. Nhân viên mở `/admin/ho-tro`, chọn hội thoại và bấm **Nhận xử lý** để trả lời. Khi đã đóng, hội thoại vẫn giữ lịch sử; khách có thể tạo yêu cầu mới.

## Cấu hình

1. Cài dependency bằng `npm run install:all` tại thư mục gốc.
2. Tạo `backend/chat-service/.env` theo `.env.example`. Dùng cùng `JWT_ACCESS_SECRET` với auth-service; `SUPABASE_KEY` phải là service role key và chỉ đặt ở backend.
3. Chạy `backend/chat-service/migrations/001_support_chat.sql` trong Supabase SQL Editor nếu database chưa có bảng chat. Migration tạo bảng, index, hàm gửi tin và các quyền `chat:view`, `chat:reply`, `chat:assign`, `chat:close` cho vai trò quản trị/nhân viên.
4. Gateway dùng `CHAT_SERVICE_URL=http://localhost:8004` mặc định. Chat service gọi order-service qua `ORDER_SERVICE_URL=http://localhost:8003` để lấy các đơn hàng gần đây.
5. Chạy `npm run dev` tại thư mục gốc, hoặc `npm run dev:chat` nếu các service khác đã chạy. Khởi động lại gateway/order-service sau khi cập nhật route.

Khi triển khai, proxy cần chuyển tiếp HTTP và WebSocket ở `/api/chat/socket.io`. Cấu hình `FRONTEND_URL` của chat-service theo địa chỉ frontend.

## Kiểm tra

- `npm test --prefix backend/chat-service`: kiểm tra quyền, nhận xử lý, gửi/đọc tin, dữ liệu đầu vào và thu hồi quyền realtime bằng model giả lập.
- `npm run build --prefix frontend`: kiểm tra frontend build.
- Dùng hai phiên trình duyệt đăng nhập khách và nhân viên: tạo hội thoại, gửi hai chiều, kiểm tra số tin chưa đọc, tải lịch sử, mất/kết nối lại mạng, đóng hội thoại và mở yêu cầu mới.

Tin nhắn giới hạn 2000 ký tự. Enter gửi tin, Shift+Enter xuống dòng. Gửi thất bại giữ lại bản nháp và mã gửi để thử lại. REST lưu dữ liệu, Socket.IO cập nhật realtime; giao diện đồng bộ lại định kỳ khi mất sự kiện.

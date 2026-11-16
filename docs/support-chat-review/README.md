# Kiểm tra chat hỗ trợ — 16/11/2026

## Phạm vi giao diện

- Chỉ style inbox admin bằng `.admin-support` và vùng nội dung chứa nó. Không sửa layout/sidebar/topbar admin.
- Heading dùng `adm-page-head`, `adm-page-title`; button dùng class admin, outline dark không đảo nền đen khi hover. Badge lấy màu Bootstrap giống các trang list.
- Khung danh sách/tin nhắn cuộn riêng, tab không cuộn ngang; thông tin khách hàng/đơn hàng mở bằng nút thông tin khi có quyền xem theo trạng thái hiện tại.
- Giữ gửi chữ, nhiều tệp, reply, nhảy đến tin gốc, reaction/chi tiết/gỡ reaction, tải lịch sử, nhận xử lý, đóng/mở lại, tìm kiếm, lọc, polling và socket.
- Hội thoại đóng vẫn có thông báo đã kết thúc, không hiển thị composer giả chỉ để giống ảnh mẫu.

## Ảnh product-001.jpg

Đọc bản ghi `message_attachments`: URL thực tế là `https://example.com/images/product-001.jpg`. Kiểm tra HTTP HEAD trả **404**, content type `text/html`. Đây là dữ liệu mẫu không có ảnh thật. Chưa thay dữ liệu database hay tự chọn ảnh sản phẩm khác. Giao diện hiện thẻ tệp và trạng thái ảnh không khả dụng; cần URL ảnh thật để phục hồi thumbnail.

## Đã sửa khi kiểm tra luồng

- Bỏ kết quả danh sách/chi tiết trả về trễ khi đã chuyển bộ lọc/hội thoại; rời socket room cũ; tránh chèn kết quả gửi/tải lịch sử vào hội thoại khác.
- Polling giữ con trỏ lịch sử đã tải ở admin và khách.
- Phía khách gửi đủ danh sách tệp đã chọn, kể cả reply, thay vì chỉ gửi tệp đầu.
- API không trả `is_read: true` vô điều kiện khi vừa gửi; thống nhất so sánh ID chuỗi/số để nhận đúng vai trò khách hàng.
- API chi tiết/lịch sử giới hạn `limit` từ 1 đến 100.

## Kiểm thử

`npm test --prefix backend/chat-service`: 9 tình huống con, tổng 10 test theo Node, đều qua. Chạy router/controller/service, JWT, multipart và Socket.IO thật; model/database, storage và tra quyền từ auth được thay bằng dữ liệu kiểm thử trong bộ nhớ. Bao phủ các route hiện có: danh sách, chi tiết, lịch sử khách, gửi chữ, gửi tệp, reply, thêm/đổi/xem/gỡ reaction, nhận xử lý, đóng/mở lại; thêm kiểm tra quyền và realtime nhận tin/khách khác không được vào room.

`npm run build --prefix frontend`: qua; còn cảnh báo kích thước bundle chung.

Kiểm tra Edge headless với response API giả lập ở 1672×941, 1366×768, 390×844: không lỗi JavaScript; tab không tràn ngang; sidebar đóng/mở; panel thông tin mở/đóng; composer có emoji; giữ bản nháp khi gửi lỗi; hover outline dark không nền đen/chữ trắng; phía khách gửi đủ hai tệp. Các ảnh trong thư mục này dùng dữ liệu kiểm thử, không phải bằng chứng kết nối production.

## Điểm cũ còn cần hoàn thiện — không kết luận toàn bộ API chuẩn 100%

- `readMessages` phía frontend hiện là stub; backend có `MessageService.read`/`MessageModel.markRead` nhưng chưa có route và luồng gọi hoàn chỉnh. Vì vậy trạng thái đã đọc và số tin chưa đọc chưa được xác nhận hoạt động end-to-end.
- Các wrapper cũ `getMyConversations`, `createConversation`, `getConversation` trong service frontend còn trả dữ liệu mẫu. Trang admin/khách hiện tại không gọi chúng; giữ nguyên để không xóa API/chức năng ngoài phạm vi.
- `emitConversation` có logic kiểm tra lại quyền nhưng các controller gửi tin hiện phát trực tiếp vào room. Test xác nhận kiểm tra quyền khi join, chưa xác nhận thu hồi quyền giữa phiên áp dụng cho mọi sự kiện.
- Nhận xử lý/gửi tin có nhiều bước ghi database, chưa có kiểm thử tranh chấp đồng thời hoặc bảo đảm idempotency khi retry.
- Chưa kiểm thử ghi lên Supabase thật, tải tệp thật, hoặc hai phiên đăng nhập qua gateway/auth thật; các test tránh thay đổi hội thoại đang dùng.

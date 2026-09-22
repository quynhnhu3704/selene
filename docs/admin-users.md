# Quản lý khách hàng và nhân viên

- Khách hàng: `/admin/nguoi-dung`; nhân viên: `/admin/nhan-vien`.
- Danh sách và Excel: `GET /auth/manage/users` và `GET /auth/manage/users/export` (qua gateway), với `role=customer|staff`, `q`, `status`, `sort`, `page`, `limit`.
- Sắp xếp tên theo từ cuối trong họ tên, so sánh tiếng Việt; trùng tên thì so sánh họ tên đầy đủ. Xuất Excel áp dụng bộ lọc hiện tại và lấy tất cả trang.
- Tổng đơn tính tất cả trạng thái, nhóm theo `orders.account_id`. Auth-service gọi `GET /manage/user-order-counts` của order-service và chuyển tiếp Authorization. Cả hai endpoint yêu cầu `profile:view`.
- Cấu hình `ORDER_SERVICE_URL` trong môi trường auth-service nếu order-service không chạy ở `http://localhost:8003`. Khởi động lại cả hai service sau khi cập nhật.
- Thêm khách hàng: `/admin/nguoi-dung/them-moi`, API `POST /auth/manage/customer/add`. Thêm nhân viên sử dụng API hiện có, mật khẩu ban đầu của cả hai là số điện thoại. Quyền cần có: `user:create` để thêm, `profile:update` để sửa, `user:update` để khóa/mở khóa.
- Template chỉ nhận props UI; từng trang Users/Staffs quản lý API, state, bộ lọc và phân trang, giống trang Products. Không dùng custom hook riêng.
- Hiện lọc/sắp xếp phía service đọc hồ sơ theo batch tối đa 500, tăng offset theo số dòng thực nhận và đối chiếu tổng số để tránh giới hạn Supabase làm thiếu dữ liệu; thống kê đơn đọc từ order DB theo batch 500. Với dữ liệu lớn nên chuyển sang truy vấn tổng hợp có index/RPC để giảm lượng dữ liệu đọc.

- API danh sách trả `{ status, message, data, pagination }`; API thống kê đơn trả `{ status, message, data }`.
- Controller danh sách và xuất Excel tách riêng; tạo workbook ở `auth-service/src/services/export.service.js`. Order model đọc dữ liệu, order service tổng hợp số đơn.
- `ProfilePage` xử lý tải/lưu hồ sơ; `ProfileForm` hiển thị form dùng chung.

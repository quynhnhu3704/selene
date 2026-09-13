# SePay trên máy local

1. Chạy ứng dụng bằng `npm run dev`.
2. Lưu authtoken vào cấu hình cá nhân: `ngrok config add-authtoken <authtoken>`.
3. Chạy `powershell -ExecutionPolicy Bypass -File scripts/start-sepay-tunnel.ps1` và giữ tiến trình chạy.
4. Trong SePay → Webhooks, tạo/bật webhook sự kiện **Có tiền vào**, chọn đúng tài khoản ngân hàng nhận tiền.
5. URL: `https://startup-marathon-dense.ngrok-free.dev/api/orders/sepay-webhook`.
6. Xác thực **API Key**: dùng giá trị `SEPAY_WEBHOOK_API_KEY` trong `backend/order-service/.env`. Đây là khóa webhook, khác authtoken ngrok. Khởi động lại order-service nếu sửa khóa.
7. Nếu cấu hình tiền tố mã thanh toán, dùng `HD`. Gửi thử từ SePay và kiểm tra HTTP 200 với `{"success":true}` trong nhật ký webhook. Payload thử không khớp đơn sẽ không cập nhật đơn.
8. Với giao dịch đã chuyển trước khi bật tunnel: vào nhật ký SePay gửi lại webhook đúng giao dịch đó. Không cần chuyển tiền lần nữa. Trang QR kiểm tra trạng thái mỗi 3 giây và chỉ báo thành công khi `payment_status=paid`.

Sau thay đổi cookie local, khởi động lại Vite/auth-service và đăng nhập lại một lần để nhận cookie trên origin hiện tại. Frontend dev gọi `/api` qua Vite proxy; không đổi frontend sang domain ngrok. Access token vẫn hết hạn sau 15 phút và tự refresh; refresh token hiện có hạn 7 ngày.

Nguồn: https://docs.sepay.vn/tich-hop-webhooks.html và https://ngrok.com/docs/agent/cli.

Địa chỉ dùng https://provinces.open-api.vn/api/v2/ (tỉnh/thành và phường/xã sau sáp nhập), theo https://provinces.open-api.vn/.

Tồn kho được giữ theo variant khi tạo đơn cho cả COD và chuyển khoản, tránh bán cùng hàng khi khách đang quét QR; nhận lại webhook không trừ kho lần hai. Cập nhật dùng compare-and-swap và hoàn kho nếu lưu đơn thất bại. Đây chưa phải transaction nhiều bảng: nếu tiến trình bị tắt hoặc database mất kết nối đúng lúc hoàn kho, cần đối soát log `STOCK_COMPENSATION_FAILED` và đơn liên quan.

# Chatbot Selene

Chatbot nằm trong layout khách hàng, không nằm trong trang quản trị. Giao diện và CSS ở `frontend/src/components/Chatbot/index.jsx`; không thêm CSS vào `global.css`. Nút cuộn đầu trang được dịch sang trái để không trùng nút chat.

## Chạy hiện tại

Giữ nguyên cấu hình và cách chạy gateway/product-service của dự án. Thêm vào `backend/product-service/.env` nếu muốn bật Gemini:

```dotenv
GEMINI_API_KEY=your-server-side-key
GEMINI_MODEL=gemini-2.5-flash
```

Khởi động lại product-service sau khi sửa biến môi trường. Chọn model mà tài khoản Gemini của bạn được phép sử dụng. Không đưa API key vào frontend. Không cần MongoDB, thư viện AI mới hoặc Qdrant cho phiên bản này. Yêu cầu Node.js 20.19+ như frontend hiện tại; backend dùng `fetch` và `AbortSignal.timeout` tích hợp.

Chạy `npm run dev` ở thư mục gốc như trước. Chatbot sử dụng `PRODUCT_SERVICE_URL` hiện có tại gateway. Thiếu key hoặc Gemini lỗi/quá thời gian thì chatbot trả lời từ danh mục và giữ thẻ sản phẩm; nếu truy xuất danh mục lỗi thì API trả 503. `source` cho biết phản hồi đến từ `gemini` hay `catalog`.

## Hợp đồng API

`POST /api/chatbot` → gateway → product-service `/chatbot`.

```json
{
  "message": "Bạn có áo sơ mi không?",
  "history": [
    { "role": "user", "text": "Xin chào" },
    { "role": "bot", "text": "Selene chào bạn!" }
  ]
}
```

Câu hỏi tối đa 2.000 ký tự; lịch sử tối đa 10 tin, mỗi tin tối đa 4.000 ký tự. Hội thoại giữ trong state của component, không lưu DB; tải lại trang sẽ xóa hội thoại. Nội dung câu hỏi, lịch sử gần nhất và sản phẩm truy xuất được gửi đến Gemini khi cấu hình key.

```json
{
  "status": 200,
  "message": "Gửi tin nhắn thành công!",
  "data": {
    "reply": "Selene tìm được những mẫu dưới đây cho bạn.",
    "products": [],
    "source": "catalog"
  }
}
```

`products` dùng các trường customer hiện tại: `product_id`, `product_name`, `image_url`, `category_name`, `discount_price`, `original_price`. Frontend dựng thẻ React và link `/san-pham/:id`, không render HTML từ AI. Truy xuất tái sử dụng `getAllProduct`, chỉ lấy sản phẩm và danh mục đang active; không khẳng định tồn kho/size vì API danh sách không cung cấp các dữ liệu đó.

## Điểm nối agent / Qdrant

- `chatbot-retrieval.service.js`: `retrieveChatbotProducts({ message, history })` trả `{ products, matched }`. Hiện dùng từ khóa và danh mục Supabase; chưa tìm kiếm ngữ nghĩa, chưa hiểu đầy đủ ngân sách, so sánh hay các tham chiếu như “mẫu trước”.
- `chatbot-ai.service.js`: `generateChatbotReply({ message, history, context })` gọi Gemini theo [GenerateContent API](https://ai.google.dev/api/generate-content), trả văn bản hoặc `null` khi chưa có key.
- `chatbot.service.js`: điều phối hai bước; có thể thay bằng agent nhưng tiếp tục trả `{ reply, products, source }`.

Khi triển khai Qdrant: đồng bộ dữ liệu catalog thành embedding với `product_id` trong payload, truy xuất các ID phù hợp rồi đọc lại Supabase để xác nhận trạng thái và giá hiện tại. Không dùng giá/tồn kho cũ trong vector payload làm nguồn chính thức. Cần triển khai riêng pipeline đồng bộ, embedding model, collection và cấu hình Qdrant; phiên bản này chưa có các thành phần đó. Khi tách agent-service, đổi target/path ở route gateway, giữ hợp đồng phía frontend.

## Kiểm tra

```sh
node --test backend/product-service/src/services/chatbot.test.js
npm run build --prefix frontend
```

Test dùng dữ liệu và Gemini giả lập, không phát sinh truy vấn thật hoặc chi phí AI. Kiểm tra thủ công khi có môi trường thật: mở/đóng chat, gửi bằng Enter, hỏi “Bạn có áo sơ mi không?”, xem giá và mở thẻ sản phẩm; kiểm tra thêm lúc tắt product-service và lúc thiếu/sai key Gemini.

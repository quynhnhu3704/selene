import amqp from 'amqplib';
import { config } from './index.js';
import crypto from 'crypto'; 
import EventEmitter from 'events'; 

let channel = null;    // Biến lưu trữ Channel (kênh truyền dữ liệu) sau khi kết nối thành công
let connection = null; // Biến lưu trữ Connection (kết nối vật lý tới CloudAMQP)

// 'amq.rabbitmq.reply-to' là một queue "ảo" (pseudo-queue) có sẵn của RabbitMQ.
// Client dùng nó để nhận phản hồi từ Server mà không cần mất công tạo và quản lý một queue tạm thời khác.
const replyQueue = 'amq.rabbitmq.reply-to';

// Bộ phát sự kiện (Emitter). Nó hoạt động như một tổng đài: Khi nhận được kết quả từ Server trả về,
// nó sẽ kích hoạt đúng hàm đang chờ (resolve) dựa vào mã định danh Correlation ID.
const responseEmitter = new EventEmitter();

//  Hàm khởi tạo kết nối tới RabbitMQ mạng lưới
export const connectRabbitMQ = async () => {
  try {
    // 1. Kết nối tới CloudAMQP 
    connection = await amqp.connect(config.rabbitMqUrl);
    
    // 2. Tạo một channel để thực hiện các thao tác gửi/nhận tin nhắn
    channel = await connection.createChannel();

    // 3. Bắt đầu lắng nghe (consume) tin nhắn phản hồi từ Server trả về thông qua queue ảo 'replyQueue'
    channel.consume(replyQueue, (msg) => {
      // Lấy Correlation ID từ thuộc tính của tin nhắn để biết tin nhắn này phản hồi cho request nào
      const correlationId = msg.properties.correlationId;
      
      // Chuyển đổi Buffer dữ liệu nhận được từ Server thành chuỗi JSON và parse thành Object NodeJS
      const content = JSON.parse(msg.content.toString());
      
      // Phát ra sự kiện với tên chính là `correlationId`, kèm theo dữ liệu `content`.
      // Hàm requestProductDetails đang đứng đợi sự kiện này sẽ nhận được data.
      responseEmitter.emit(correlationId, content);
    }, { 
      // noAck: true nghĩa là tự động xác nhận đã nhận tin nhắn với RabbitMQ, 
      // vì đây là queue phản hồi trực tiếp nên không cần xác nhận thủ công (manual acknowledgment).
      noAck: true 
    });

    console.log('[x] Connected to RabbitMQ for RPC client');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ (Client):', error.message);
  }
};

// Hàm gửi danh sách variantIds sang Product Service để lấy thông tin chi tiết sản phẩm
export const requestProductDetails = async (variantIds) => {
  // Kiểm tra xem channel đã được khởi tạo qua hàm connectRabbitMQ chưa, nếu chưa thì báo lỗi ứng dụng
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  // Trả về một Promise để code ở tầng Service (như cart.service.js) có thể sử dụng `await`
  return new Promise((resolve, reject) => {
    // Tạo một mã định danh ngẫu nhiên dài 32 ký tự hexa (ví dụ: '4f2a7e...') cho request này.
    // Mã này đảm bảo kết quả trả về từ Server không bị lẫn lộn giữa các lượt gọi API khác nhau.
    const correlationId = crypto.randomBytes(16).toString('hex');
    
    // Thiết lập một bộ đếm thời gian (Timeout) phòng trường hợp Product Service bị sập hoặc quá tải
    const timeout = setTimeout(() => {
      // Nếu quá 10 giây không có phản hồi, xóa hàm lắng nghe sự kiện của request này đi để tránh rò rỉ bộ nhớ (memory leak)
      responseEmitter.removeAllListeners(correlationId);
      // Kết thúc Promise với một lỗi cụ thể (Timeout), đáp ứng đúng kế hoạch kiểm thử (Verification Plan) của bạn
      reject(new Error('RPC Request Timeout'));
    }, 10000); // Thời gian chờ tối đa là 10 giây (10000ms)

    // Đăng ký lắng nghe sự kiện ĐÚNG MỘT LẦN (once) với tên sự kiện là `correlationId` vừa tạo ở trên
    responseEmitter.once(correlationId, (response) => {
      // Khi nhận được phản hồi thành công trước khi hết 10 giây:
      clearTimeout(timeout); // Hủy bỏ bộ đếm thời gian Timeout ngay lập tức
      resolve(response);     // Trả dữ liệu sản phẩm về cho hàm gọi API (hoàn thành Promise)
    });

    // Tên queue mà Product Service (RPC Server) đang đứng đợi lắng nghe dữ liệu đầu vào
    const queueName = 'rpc_product_queue';
    
    // Chuyển mảng variantIds thành chuỗi JSON, ép kiểu sang Buffer rồi gửi vào queue
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(variantIds)), {
      correlationId: correlationId, // Đính kèm ID của request này vào thuộc tính tin nhắn
      replyTo: replyQueue           // Chỉ định cho Server biết: "Khi xử lý xong hãy gửi kết quả về địa chỉ này"
    });
  });
};

// Hàm gửi sự kiện cập nhật tồn kho khi đặt hàng thành công
export const sendUpdateProductStock = async (orderItems) => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  const queueName = 'update_stock_queue';
  await channel.assertQueue(queueName, { durable: false });

  // Lọc ra các thông tin cần thiết: variant_id và quantity
  const payload = orderItems.map(item => ({
    variant_id: item.variant_id,
    quantity: item.quantity
  }));

  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)));
  console.log('[x] Sent stock update event to queue:', queueName);
};

// Hàm gửi sự kiện thông báo (ví dụ: email hóa đơn) khi đặt hàng thành công
export const sendOrderNotificationEvent = async (orderData) => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  const queueName = 'order_notification_queue';
  // Đảm bảo queue tồn tại và bền bỉ
  await channel.assertQueue(queueName, { durable: true });

  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(orderData)));
  console.log('[x] Sent order notification event to queue:', queueName);
};
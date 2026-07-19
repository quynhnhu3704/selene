import amqp from 'amqplib';
import { config } from './index.js'; 
import { supabase } from './supabase.js'; 

let channel = null; // Biến dùng để lưu giữ Channel sau khi kết nối thành công

//  Hàm khởi tạo kết nối tới RabbitMQ mạng lưới ở phía Server
export const connectRabbitMQ = async () => {
  try {
    // 1. Kết nối tới CloudAMQP 
    const connection = await amqp.connect(config.rabbitMqUrl);
    
    // 2. Tạo một channel (kênh) để bắt đầu các tác vụ nhận/gửi message
    channel = await connection.createChannel();
    console.log('[x] Connected to RabbitMQ (Product Service)');
    
    // 3. Kích hoạt hàm lắng nghe queue ngay lập tức sau khi kết nối thành công
    await listenForCartProductDetails();
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error.message);
  }
};


// Hàm lắng nghe yêu cầu RPC từ queue để truy vấn và cung cấp thông tin sản phẩm cho giỏ hàng
export const listenForCartProductDetails = async () => {
  // Phòng hờ trường hợp hàm này chạy trước khi có kết nối channel thành công
  if (!channel) throw new Error('RabbitMQ channel is not initialized');

  const queueName = 'rpc_product_queue';
  
  // Khai báo một queue với cấu hình durable: false (không lưu queue xuống đĩa cứng nếu RabbitMQ restart)
  // Bước này đảm bảo queue `rpc_product_queue` luôn tồn tại trên hệ thống để hứng tin nhắn
  await channel.assertQueue(queueName, { durable: false });
  
  // Cấu hình Prefetch = 1. Đây là cơ chế phân phối công việc (Fair dispatch).
  // Nó báo với RabbitMQ rằng: "Chỉ gửi cho service này 1 tin nhắn duy nhất tại một thời điểm".
  // Server phải xử lý xong và gọi `channel.ack(msg)` thì RabbitMQ mới phân phối tin nhắn tiếp theo.
  channel.prefetch(1);

  console.log(`[x] Awaiting RPC requests for cart products on ${queueName}`);

  // Bắt đầu quá trình lắng nghe dữ liệu đổ vào queue
  channel.consume(queueName, async (msg) => {
      let responseData = []; // Mảng chứa kết quả cuối cùng để phản hồi về Client
      
      try {
        // Chuyển đổi Buffer dữ liệu nhận được từ Client thành mảng các variantId
        const variantIds = JSON.parse(msg.content.toString());
        console.log(`[.] Received request for variants:`, variantIds);
        
        // Tạo một mảng các Promise xử lý đồng thời (parallel) nhằm tăng tốc hiệu năng truy vấn database
        const detailsPromises = variantIds.map(async (variantId) => {
          try {
            // --- BƯỚC 2.1: Lấy thông tin thuộc về biến thể (size, color, stock, product_id) ---
            const { data: variant, error: vErr } = await supabase
              .from('product_variants')
              .select('*')
              .eq('variant_id', variantId)
              .single(); 
              
            // Nếu xảy ra lỗi DB hoặc không tìm thấy biến thể, loại bỏ phần tử này khỏi giỏ hàng
            if (vErr || !variant) return null;
            
            // --- BƯỚC 2.2: Lấy thông tin chung của sản phẩm (tên, hình ảnh, giá cả gốc/giảm) ---
            const { data: product, error: pErr } = await supabase
              .from('products')
              .select('product_name, image_urls, original_price, discount_price')
              .eq('product_id', variant.product_id)
              .single();
              
            if (pErr || !product) return null;

            // Xử lý dữ liệu hình ảnh phòng trường hợp dữ liệu lưu dưới dạng JSON String hoặc Plain String
            let images = product.image_urls;
            if (typeof images === 'string') {
              try { 
                images = JSON.parse(images); 
              } catch (e) { 
                images = [images]; // Nếu parse fail, bọc nó lại thành mảng chứa 1 chuỗi string duy nhất
              }
            }
            
            // trả dữ liệu
            return {
              product_id: variant.product_id,
              variant_id: variantId,
              product_name: product.product_name,
              image_url: images && images.length > 0 ? images[0] : null, 
              original_price: product.original_price,
              discount_price: product.discount_price,
              size: variant.size,
              color: variant.color,
              stock_quantity: variant.stock_quantity
            };
          } catch (e) {
            console.error(e);
            return null;
          }
        });
        
        // Đợi tất cả các tiến trình truy vấn DB của mọi variantId hoàn thành
        const results = await Promise.all(detailsPromises);
        
        // Lọc bỏ những phần tử bị null (do lỗi database hoặc biến thể không tồn tại)
        responseData = results.filter(item => item !== null);
      } catch (err) {
        console.error('Error processing RPC request:', err);
      }

      // --- BƯỚC 3: GỬI PHẢN HỒI NGƯỢC LẠI CHO CLIENT ---
      // msg.properties.replyTo: Địa chỉ queue ảo phản hồi trực tiếp của Client gửi kèm sang.
      channel.sendToQueue(msg.properties.replyTo,
        Buffer.from(JSON.stringify(responseData)), // Ép mảng kết quả thành Buffer JSON string để truyền qua mạng
        { 
          // Trả lại đúng mã Correlation ID mà client gửi sang, để client nhận biết phản hồi này thuộc về request nào
          correlationId: msg.properties.correlationId 
        }
      );

      // Xác nhận với RabbitMQ rằng tin nhắn này đã được Server xử lý xong hoàn toàn (Acknowledge)
      // Lúc này RabbitMQ mới xóa tin nhắn khỏi queue và sẵn sàng phân phối tin nhắn mới (nhờ prefetch(1))
      channel.ack(msg);
    });
};
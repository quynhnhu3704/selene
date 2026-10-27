import amqp from "amqplib";
import { config } from "./index.js";
import { supabase } from "./supabase.js";
import { updatePromotionUsedQuantityOnOrder } from "../services/promotion.service.js";
import { reserveStock, restoreStock } from "../services/stock.service.js";

let channel = null; // Biến dùng để lưu giữ Channel sau khi kết nối thành công

//  Hàm khởi tạo kết nối tới RabbitMQ mạng lưới ở phía Server
export const connectRabbitMQ = async () => {
  try {
    // 1. Kết nối tới CloudAMQP
    const connection = await amqp.connect(config.rabbitMqUrl);

    // 2. Tạo một channel (kênh) để bắt đầu các tác vụ nhận/gửi message
    channel = await connection.createChannel();
    console.log("[x] Connected to RabbitMQ (Product Service)");

    // 3. Kích hoạt hàm lắng nghe queue ngay lập tức sau khi kết nối thành công
    await listenForCartProductDetails();
    await listenForStockUpdate();
    await listenForStockRequests();
  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error.message);
  }
};

async function listenForStockRequests() {
  const queue = "rpc_stock_queue";
  await channel.assertQueue(queue, { durable: false });
  await channel.consume(queue, async (msg) => {
    if (!msg) return;
    let response;
    try {
      const { action, items } = JSON.parse(msg.content.toString());
      if (!Array.isArray(items) || !["reserve", "restore"].includes(action))
        throw new Error("Yêu cầu tồn kho không hợp lệ.");
      if (action === "reserve") await reserveStock(items);
      else await restoreStock(items);
      response = { success: true };
    } catch (error) {
      response = { success: false, message: error.message };
    }
    channel.sendToQueue(
      msg.properties.replyTo,
      Buffer.from(JSON.stringify(response)),
      { correlationId: msg.properties.correlationId },
    );
    channel.ack(msg);
  });
}

// In-memory cache cho thông tin sản phẩm giỏ hàng (TTL 30s) giúp trả lời RPC tức thì (0ms DB time)
export const rpcProductDetailsCache = new Map();

// Hàm lắng nghe yêu cầu RPC từ queue để truy vấn và cung cấp thông tin sản phẩm cho giỏ hàng
export const listenForCartProductDetails = async () => {
  // Phòng hờ trường hợp hàm này chạy trước khi có kết nối channel thành công
  if (!channel) throw new Error("RabbitMQ channel is not initialized");

  const queueName = "rpc_product_queue";

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
      const rawPayload = JSON.parse(msg.content.toString());
      const variantIds = Array.isArray(rawPayload)
        ? rawPayload.filter(Boolean)
        : [];
      console.log(`[.] Received request for variants:`, variantIds);

      if (variantIds.length > 0) {
        // 1. Kiểm tra cache
        const cachedResults = [];
        const missingIds = [];

        for (const vid of variantIds) {
          const item = rpcProductDetailsCache.get(vid);
          if (item && Date.now() - item.timestamp < 30000) {
            cachedResults.push(item.data);
          } else {
            missingIds.push(vid);
          }
        }

        if (missingIds.length === 0) {
          responseData = cachedResults;
        } else {
          const parseImageUrl = (imageUrls) => {
            if (!imageUrls) return null;
            if (Array.isArray(imageUrls)) {
              return imageUrls.length > 0 ? imageUrls[0] : null;
            }
            if (typeof imageUrls === "string") {
              try {
                const parsed = JSON.parse(imageUrls);
                if (Array.isArray(parsed)) {
                  return parsed.length > 0 ? parsed[0] : null;
                }
                return parsed || imageUrls;
              } catch (e) {
                return imageUrls;
              }
            }
            return null;
          };

          let freshResults = [];

          // --- BƯỚC 2: Tối ưu truy vấn: Lấy các biến thể còn thiếu trong 1 lần gọi DB ---
          const { data: variantsWithProduct, error: joinErr } = await supabase
            .from("product_variants")
            .select(`
              variant_id,
              product_id,
              size,
              color,
              stock_quantity,
              products (
                product_name,
                image_urls,
                original_price,
                discount_price
              )
            `)
            .in("variant_id", missingIds);

          if (!joinErr && Array.isArray(variantsWithProduct)) {
            freshResults = variantsWithProduct
              .filter((v) => v && v.products)
              .map((v) => {
                const prod = Array.isArray(v.products)
                  ? v.products[0]
                  : v.products;
                return {
                  product_id: v.product_id,
                  variant_id: v.variant_id,
                  product_name: prod?.product_name || "",
                  image_url: parseImageUrl(prod?.image_urls),
                  original_price: prod?.original_price || 0,
                  discount_price: prod?.discount_price,
                  size: v.size,
                  color: v.color,
                  stock_quantity: v.stock_quantity,
                };
              });
          } else {
            // Fallback nếu join chưa được cấu hình FK ở PostgREST: Query 2 batch thay vì N+1
            console.warn(
              "[RPC] Join query failed, falling back to batch query:",
              joinErr?.message,
            );
            const { data: variants, error: vErr } = await supabase
              .from("product_variants")
              .select("*")
              .in("variant_id", missingIds);

            if (!vErr && Array.isArray(variants) && variants.length > 0) {
              const productIds = [
                ...new Set(variants.map((v) => v.product_id).filter(Boolean)),
              ];
              const { data: products } = await supabase
                .from("products")
                .select(
                  "product_id, product_name, image_urls, original_price, discount_price",
                )
                .in("product_id", productIds);

              const productMap = new Map(
                (products || []).map((p) => [p.product_id, p]),
              );

              freshResults = variants
                .map((v) => {
                  const prod = productMap.get(v.product_id);
                  if (!prod) return null;
                  return {
                    product_id: v.product_id,
                    variant_id: v.variant_id,
                    product_name: prod.product_name,
                    image_url: parseImageUrl(prod.image_urls),
                    original_price: prod.original_price,
                    discount_price: prod.discount_price,
                    size: v.size,
                    color: v.color,
                    stock_quantity: v.stock_quantity,
                  };
                })
                .filter(Boolean);
            }
          }

          // Lưu các item mới vào cache
          for (const item of freshResults) {
            rpcProductDetailsCache.set(item.variant_id, {
              data: item,
              timestamp: Date.now(),
            });
          }

          responseData = [...cachedResults, ...freshResults];
        }
      }
    } catch (err) {
      console.error("Error processing RPC request:", err);
    }

    // --- BƯỚC 3: GỬI PHẢN HỒI NGƯỢC LẠI CHO CLIENT ---
    // msg.properties.replyTo: Địa chỉ queue ảo phản hồi trực tiếp của Client gửi kèm sang.
    channel.sendToQueue(
      msg.properties.replyTo,
      Buffer.from(JSON.stringify(responseData)), // Ép mảng kết quả thành Buffer JSON string để truyền qua mạng
      {
        // Trả lại đúng mã Correlation ID mà client gửi sang, để client nhận biết phản hồi này thuộc về request nào
        correlationId: msg.properties.correlationId,
      },
    );

    // Xác nhận với RabbitMQ rằng tin nhắn này đã được Server xử lý xong hoàn toàn (Acknowledge)
    // Lúc này RabbitMQ mới xóa tin nhắn khỏi queue và sẵn sàng phân phối tin nhắn mới (nhờ prefetch(1))
    channel.ack(msg);
  });
};

// Hàm lắng nghe yêu cầu cập nhật (trừ) tồn kho sau khi đơn hàng được đặt thành công
export const listenForStockUpdate = async () => {
  if (!channel) throw new Error("RabbitMQ channel is not initialized");

  const queueName = "update_stock_queue";
  await channel.assertQueue(queueName, { durable: false });

  console.log(`[x] Awaiting stock update events on ${queueName}`);

  channel.consume(queueName, async (msg) => {
    try {
      const items = JSON.parse(msg.content.toString());
      console.log(`[.] Received stock update event for variants:`, items);

      for (const item of items) {
        // Xóa cache để lượt query tiếp theo lấy số lượng mới nhất
        rpcProductDetailsCache.delete(item.variant_id);

        // Lấy số lượng tồn kho và trạng thái hiện tại
        const { data: variant, error: fetchErr } = await supabase
          .from("product_variants")
          .select("stock_quantity, status")
          .eq("variant_id", item.variant_id)
          .single();

        if (fetchErr || !variant) {
          console.error(
            `Không tìm thấy variant ${item.variant_id} hoặc lỗi DB:`,
            fetchErr,
          );
          continue;
        }

        const newStock = Math.max(0, variant.stock_quantity - item.quantity);
        const updatePayload = { stock_quantity: newStock };

        if (newStock === 0) {
          updatePayload.status = "out_of_stock";
        } else if (newStock > 0 && variant.status === "out_of_stock") {
          updatePayload.status = "active";
        }

        // Cập nhật tồn kho và trạng thái mới
        const { error: updateErr } = await supabase
          .from("product_variants")
          .update(updatePayload)
          .eq("variant_id", item.variant_id);

        if (updateErr) {
          console.error(
            `Lỗi cập nhật tồn kho cho variant ${item.variant_id}:`,
            updateErr,
          );
        } else {
          console.log(
            `[+] Cập nhật thành công tồn kho cho variant ${item.variant_id}: ${variant.stock_quantity} -> ${newStock} (status: ${updatePayload.status || variant.status})`,
          );
        }
      }

      // Cập nhật số lượng đã sử dụng (used_quantity) của các chương trình khuyến mãi liên quan
      await updatePromotionUsedQuantityOnOrder(items);
    } catch (err) {
      console.error("Lỗi xử lý sự kiện cập nhật tồn kho và khuyến mãi:", err);
    }
    // Xác nhận đã nhận và xử lý xong message
    channel.ack(msg);
  });
};

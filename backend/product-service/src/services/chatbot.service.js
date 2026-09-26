import { retrieveChatbotProducts } from "./chatbot-retrieval.service.js";
import { generateChatbotReply } from "./chatbot-ai.service.js";

// Điều phối truy xuất và AI qua hợp đồng chung, giữ API ổn định khi thêm agent.
export const getChatbotReply = async ({ message, history }) => {
  const context = await retrieveChatbotProducts({ message, history });
  let reply = context.matched
    ? "Selene tìm được những mẫu dưới đây cho bạn. Bạn có thể nhấn vào sản phẩm để xem chi tiết nhé! 😊"
    : "Selene chưa tìm thấy mẫu khớp với câu hỏi của bạn. Bạn cho mình biết thêm tên hoặc loại trang phục nhé! Một vài mẫu tham khảo ở bên dưới. ✨";

  if (context.products.length === 0) {
    reply =
      "Selene chưa tìm thấy sản phẩm phù hợp để giới thiệu. Bạn cho mình biết thêm loại trang phục đang tìm nhé!";
  }

  let source = "catalog";
  try {
    const aiReply = await generateChatbotReply({ message, history, context });
    if (aiReply) {
      reply = aiReply;
      source = "gemini";
    }
  } catch (error) {
    console.error("Lỗi tại generateChatbotReply:", error.message);
  }

  return { reply, products: context.products, source };
};

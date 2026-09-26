import { getAllProduct } from "./product.service.js";

const CHATBOT_STOP_WORDS = new Set([
  "tôi",
  "mình",
  "bạn",
  "ơi",
  "có",
  "bán",
  "không",
  "ko",
  "cho",
  "xem",
  "tìm",
  "muốn",
  "mua",
  "giúp",
  "với",
  "nhé",
  "ạ",
  "các",
  "những",
  "nào",
]);

// Chuẩn hóa câu hỏi thành từ khóa tìm sản phẩm, không xóa ký tự giữa tên riêng.
export const getChatbotKeyword = (message) => {
  return message
    .toLocaleLowerCase("vi")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => !CHATBOT_STOP_WORDS.has(word))
    .join(" ")
    .trim()
    .slice(0, 100);
};

// Cổng truy xuất độc lập để thay tìm kiếm Supabase bằng Qdrant sau này.
export const retrieveChatbotProducts = async ({ message }) => {
  const keyword = getChatbotKeyword(message);
  const result = keyword
    ? await getAllProduct({ q: keyword, limit: 10 })
    : { products: [] };

  if (result.products.length > 0) {
    return { products: result.products, matched: true };
  }

  const suggestions = await getAllProduct({ limit: 3 });
  return { products: suggestions.products, matched: false };
};

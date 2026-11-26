import http from "./http";

const API_BASE = import.meta.env.DEV ? "/api" : import.meta.env.VITE_API_URL;

/**
 * Gửi câu hỏi tới AI Service qua API Gateway (/api/chatbot -> /api/v1/chat).
 */
export const sendMessageToBot = async ({
  message,
  history = [],
  top_k = 3,
  user_id,
  session_id,
}) => {
  const payload = {
    message,
    history,
    top_k,
  };
  if (user_id) payload.user_id = String(user_id);
  if (session_id) payload.session_id = String(session_id);

  const res = await http.post("/chatbot", payload, {
    withCredentials: false,
    timeout: 45000,
  });

  return res.data;
};

/**
 * Thông báo kết thúc phiên chat AI để backend chạy tóm tắt ngữ cảnh ngay.
 */
export const endBotSession = async ({ session_id, user_id, messages = [] }) => {
  if (!session_id) return null;
  const payload = { session_id: String(session_id) };
  if (user_id) payload.user_id = String(user_id);
  if (Array.isArray(messages) && messages.length > 0) {
    payload.messages = messages;
  }

  const res = await http.post("/chatbot/end-session", payload, {
    withCredentials: false,
    timeout: 10000,
  });
  return res.data;
};

/**
 * Gửi tín hiệu kết thúc phiên khi người dùng đóng tab/rời trang bằng sendBeacon.
 */
export const sendBotEndSessionBeacon = ({ session_id, user_id, messages = [] }) => {
  if (!session_id || typeof navigator === "undefined" || !navigator.sendBeacon) {
    return false;
  }
  const payload = { session_id: String(session_id) };
  if (user_id) payload.user_id = String(user_id);
  if (Array.isArray(messages) && messages.length > 0) {
    payload.messages = messages;
  }
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  return navigator.sendBeacon(`${API_BASE}/chatbot/end-session`, blob);
};

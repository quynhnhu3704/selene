import http from "./http";
import { getUser } from "../utils/auth";

/**
 * Lấy danh sách cuộc trò chuyện quản lý (Admin / Staff)
 * @param {Object} params - { status, search }
 * @returns {Promise} Axios response: { success, message, data: conversations[], summary: { waitingCount, processingCount, closedCount } }
 */
export const getConversations = async (params = {}) => {
  return await http.get("/chat/manage/conversations", { params });
};

// Phiên làm việc chat của người dùng hiện tại
export const getChatSession = async () => {
  const user = getUser();
  return {
    data: {
      data: {
        accountId: user?.accountId || user?.account_id || 1,
        full_name: user?.full_name || "Nhân viên hỗ trợ",
        role: user?.role || "admin",
        permissions: user?.permissions || ["chat:view", "chat:assign", "chat:close", "chat:reply"],
      },
    },
  };
};

export const getMyConversations = async () => ({
  data: {
    data: [
      {
        conversation_id: 1,
        customer_id: 101,
        customer_name: "Nguyễn Văn A",
        customer_unread: 0,
        staff_unread: 0,
        status: "open",
        last_message: "Xin chào, tôi cần hỗ trợ thông tin sản phẩm.",
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ],
  },
});

export const createConversation = async () => ({
  data: {
    data: {
      conversation_id: Date.now(),
      customer_id: 101,
      customer_name: "Nguyễn Văn A",
      customer_unread: 0,
      staff_unread: 0,
      status: "open",
      last_message: "Yêu cầu hỗ trợ mới",
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  },
});

export const getConversation = async (id) => ({
  data: {
    data: {
      conversation_id: id,
      customer_id: 101,
      customer_name: "Nguyễn Văn A",
      assigned_staff_id: null,
      status: "waiting",
      created_at: new Date().toISOString(),
      customer: { full_name: "Nguyễn Văn A", email: "khachhang@example.com", phone: "0901234567" },
    },
  },
});

/**
 * Nhận xử lý cuộc trò chuyện (tự động gửi tin nhắn chào và chuyển trạng thái)
 * @param {string} conversationId
 * @param {Object} payload - { staff_name, content }
 */
export const assignConversation = async (conversationId, payload = {}) => {
  return await http.put(`/chat/manage/conversations/${conversationId}/assign`, payload);
};

/**
 * Đóng cuộc trò chuyện
 * @param {string} conversationId
 */
export const closeConversation = async (conversationId) => {
  return await http.put(`/chat/manage/conversations/${conversationId}/close`);
};


/**
 * Lấy danh sách tin nhắn và thông tin chi tiết cuộc trò chuyện (khách hàng, đơn hàng)
 * @param {string} conversationId - ID cuộc hội thoại
 * @param {Object} params - { before, limit }
 */
export const getConversationDetails = async (conversationId, params = {}) => {
  return await http.get(`/chat/manage/conversations/${conversationId}/messages`, { params });
};

export const getMessages = async (conversationId, params = {}) => {
  return await getConversationDetails(conversationId, params);
};

/**
 * Lấy danh sách tin nhắn của khách hàng hiện tại (10 tin mới nhất, hỗ trợ before khi kéo lên)
 * API: router.get("/my-conversation/messages", getMyMessages);
 * @param {Object} params - { before, limit }
 * @returns {Promise} Axios response: { success, message, data: { conversation_id, customer_id, customer_name, status, messages, pagination } }
 */
export const getMyMessages = async (params = {}) => {
  return await http.get("/chat/my-conversation/messages", { params });
};

// Aliases cho tương thích linh hoạt
export const getMyConversationMessages = getMyMessages;
export const getCustomerMessages = getMyMessages;

/**
 * Gửi 1 tin nhắn loại text
 * API: POST /api/chat/messages/text (qua Vite proxy -> http://localhost:8000/api/chat/messages/text)
 * @param {Object} payload - { content: string, conversation_id?: string, customer_id?: string, reply_to_message_id?: string, sender_type?: string }
 * @returns {Promise} Axios response: { success, message, data: { message, conversation, is_new_conversation } }
 */
export const sendTextMessage = async (payload) => {
  return await http.post("/chat/messages/text", payload);
};

/**
 * Gửi tin nhắn đính kèm hình ảnh, video, tệp tin trực tiếp qua multipart/form-data
 * @param {FormData|Object} payload - FormData chứa trường 'file' (hoặc object) và metadata
 * @returns {Promise}
 */
export const sendAttachmentMessage = async (payload) => {
  if (payload instanceof FormData) {
    return await http.post("/chat/messages/attachment", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
  const formData = new FormData();
  if (payload.file) formData.append("file", payload.file);
  if (payload.conversation_id) formData.append("conversation_id", payload.conversation_id);
  if (payload.content) formData.append("content", payload.content);
  if (payload.customer_id) formData.append("customer_id", payload.customer_id);
  if (payload.reply_to_message_id) formData.append("reply_to_message_id", payload.reply_to_message_id);
  if (payload.sender_type) formData.append("sender_type", payload.sender_type);
  if (payload.message_type) formData.append("message_type", payload.message_type);

  return await http.post("/chat/messages/attachment", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const sendMessage = async (idOrPayload, data = {}) => {
  if (idOrPayload instanceof FormData) {
    return await sendAttachmentMessage(idOrPayload);
  }
  if (typeof idOrPayload === "object" && idOrPayload !== null) {
    if (idOrPayload.file) return await sendAttachmentMessage(idOrPayload);
    return await sendTextMessage(idOrPayload);
  }
  if (data?.file) {
    return await sendAttachmentMessage({ conversation_id: idOrPayload, ...data });
  }
  return await sendTextMessage({
    conversation_id: idOrPayload,
    ...(data || {}),
  });
};

export const readMessages = async () => ({
  data: { data: [] },
});

/**
 * Trả lời (reply) một tin nhắn cụ thể
 * @param {string|number|Object|FormData} messageIdOrPayload - ID tin nhắn cần reply hoặc Payload Object / FormData
 * @param {Object} [data] - Dữ liệu kèm theo nếu tham số 1 là messageId: { content, file, ... }
 * @returns {Promise} Axios response: { success, message, data: { message } }
 */
export const replyMessage = async (messageIdOrPayload, data = {}) => {
  let messageId = null;
  let payload = data;

  if (typeof messageIdOrPayload === "string" || typeof messageIdOrPayload === "number") {
    messageId = String(messageIdOrPayload);
  } else if (messageIdOrPayload instanceof FormData) {
    messageId =
      messageIdOrPayload.get("reply_to_message_id") ||
      messageIdOrPayload.get("message_id");
    payload = messageIdOrPayload;
  } else if (typeof messageIdOrPayload === "object" && messageIdOrPayload !== null) {
    messageId =
      messageIdOrPayload.reply_to_message_id ||
      messageIdOrPayload.message_id ||
      messageIdOrPayload.replyToMessageId;
    payload = messageIdOrPayload;
  }

  if (payload instanceof FormData) {
    return await http.post(`/chat/messages/${messageId}/reply`, payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  if (payload?.file) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, val]) => {
      if (val !== undefined && val !== null) formData.append(key, val);
    });
    return await http.post(`/chat/messages/${messageId}/reply`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  return await http.post(`/chat/messages/${messageId}/reply`, payload);
};

/**
 * Thả / Đổi / Bật tắt reaction cho tin nhắn
 * (1 tin nhắn có thể có nhiều reaction từ nhiều tài khoản, mỗi tài khoản được thả 1 reaction)
 * @param {string|number} messageId
 * @param {string} reaction - Ví dụ: ❤️, 👍, 😂, 😮, 😢, 😡
 * @returns {Promise} Axios response: { success, message, data: { action, message_id, conversation_id, account_id, reaction, reactions, summary } }
 */
export const reactToMessage = async (messageId, reaction) => {
  return await http.post(`/chat/messages/${messageId}/reaction`, { reaction });
};

/**
 * Hủy reaction của tài khoản hiện tại trên tin nhắn
 * @param {string|number} messageId
 * @returns {Promise}
 */
export const removeReaction = async (messageId) => {
  return await http.delete(`/chat/messages/${messageId}/reaction`);
};

/**
 * Lấy danh sách toàn bộ biểu cảm của một tin nhắn
 * @param {string|number} messageId
 * @returns {Promise}
 */
export const getMessageReaction = async (messageId) => {
  return await http.get(`/chat/messages/${messageId}/reaction`);
};

export const getMessageReactions = getMessageReaction;







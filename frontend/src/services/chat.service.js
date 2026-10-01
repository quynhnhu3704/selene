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

export const assignConversation = async (id) => ({
  data: {
    data: { conversation_id: id, status: "open", assigned_staff_id: 1 },
  },
});

export const closeConversation = async (id) => ({
  data: {
    data: { conversation_id: id, status: "closed" },
  },
});

export const getMessages = async (id) => ({
  data: {
    data: [
      {
        message_id: 1,
        conversation_id: id,
        sender_id: 101,
        sender_role: "customer",
        content: "Xin chào shop, tôi cần tư vấn sản phẩm.",
        created_at: new Date().toISOString(),
        is_read: true,
      },
    ],
  },
});

export const sendMessage = async (id, data) => ({
  data: {
    data: {
      message_id: Date.now(),
      conversation_id: id,
      sender_id: 1,
      sender_role: "admin",
      content: data.content || "",
      created_at: new Date().toISOString(),
      is_read: true,
    },
  },
});

export const readMessages = async () => ({
  data: { data: [] },
});



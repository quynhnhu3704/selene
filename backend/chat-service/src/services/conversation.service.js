import { ConversationModel } from "../models/conversation.model.js";

export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === "admin" || user.role === "staff") return true;
  if (Array.isArray(user.permissions) && user.permissions.includes(permission))
    return true;
  return false;
};

export const requirePermission = (user, permission) => {
  if (!hasPermission(user, permission)) {
    throw {
      status: 403,
      message: "Bạn không có quyền thực hiện thao tác này!",
    };
  }
};

export const ConversationService = {
  // Lấy danh sách các cuộc trò chuyện
  getConversations: async (user, { status, search }) => {
    requirePermission(user, "chat:view");

    const [conversations, waitingCount, processingCount, closedCount] =
      await Promise.all([
        ConversationModel.findAll({ status, search }),
        ConversationModel.countByStatus(["pending", "waiting"]),
        ConversationModel.countByStatus(["processing", "open", "active"]),
        ConversationModel.countByStatus(["closed"]),
      ]);

    return {
      conversations,
      summary: {
        waitingCount,
        processingCount,
        closedCount,
      },
    };
  },

  getAccessible: async (user, id) => {
    if (!id || typeof id !== "string") {
      throw { status: 400, message: "Mã hội thoại không hợp lệ!" };
    }
    const conversation = await ConversationModel.findById(id);
    if (!conversation)
      throw { status: 404, message: "Không tìm thấy hội thoại!" };
    if (
      user.role === "customer" &&
      conversation.customer_id !== user.accountId
    ) {
      throw { status: 403, message: "Bạn không được truy cập hội thoại này!" };
    }
    return conversation;
  },
};

import { ConversationModel } from "../models/conversation.model.js";
import { CustomerModel } from "../models/customer.model.js";
import { MessageModel } from "../models/message.model.js";
import { getCustomerOrders } from "./order.service.js";

export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === "admin" || user.role === "staff") return true;
  if (Array.isArray(user.permissions) && user.permissions.includes(permission)) return true;
  return false;
};

export const requirePermission = (user, permission) => {
  if (!hasPermission(user, permission)) {
    throw { status: 403, message: "Bạn không có quyền thực hiện thao tác này!" };
  }
};

export const ConversationService = {
  // Lấy danh sách các cuộc trò chuyện
  getConversations: async (user, { status, search, order }) => {
    requirePermission(user, "chat:view");

    const [conversations, waitingCount, processingCount, closedCount] = await Promise.all([
      ConversationModel.findAll({ status, search, order }),
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
      throw { status: 400, message: "Mã hội thoại hoặc mã khách hàng không hợp lệ!" };
    }
    // 1. Thử tìm theo conversation_id
    let conversation = await ConversationModel.findById(id);

    // 2. Nếu không tìm thấy, thử tìm theo customer_id
    if (!conversation) {
      conversation = await ConversationModel.findByCustomerId(id);
    }

    if (!conversation) {
      throw { status: 404, message: "Không tìm thấy hội thoại của khách hàng này!" };
    }

    if (user.role === "customer" && conversation.customer_id !== user.accountId) {
      throw { status: 403, message: "Bạn không được truy cập hội thoại này!" };
    }
    return conversation;
  },

  // Lấy danh sách tin nhắn (mỗi lần 10 tin nhắn mới nhất) kèm theo thông tin khách hàng và đơn hàng 2 tháng gần đây theo cuộc hội thoại được chọn
  getConversationDetails: async (user, id, { before, limit = 10 } = {}) => {
    const conversation = await ConversationService.getAccessible(user, id);

    const customerId = conversation.customer_id;
    const fetchLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 10;

    // Lấy song song:
    // 1. 10 tin nhắn mới nhất (hoặc theo con trỏ before khi kéo lên)
    // 2. Thông tin khách hàng (truy cập bảng user_profiles)
    // 3. Danh sách 3 đơn hàng gần nhất trong 2 tháng
    const [messagesResult, customerInfo, orders] = await Promise.all([
      MessageModel.findByConversation(conversation.conversation_id, before, fetchLimit),
      CustomerModel.findByAccountId(customerId, conversation.customer_name),
      customerId ? getCustomerOrders(customerId) : Promise.resolve([]),
    ]);

    // Chuẩn hóa tin nhắn kèm thông tin vai trò người gửi và tương thích frontend
    const formattedMessages = (messagesResult.messages || []).map((msg) => ({
      ...msg,
      sender_role:
        msg.sender_id === customerId
          ? "customer"
          : msg.sender_type === "ai"
            ? "ai"
            : "staff",
      is_read: Boolean(msg.is_read) || msg.status === "seen",
    }));

    // Tìm nhân viên đã gửi tin nhắn hỗ trợ trong hội thoại (nếu DB chưa có cột assigned_staff_id)
    const staffMsg = formattedMessages.find((m) => m.sender_role === "staff");
    const assignedStaffId = conversation.assigned_staff_id || staffMsg?.sender_id || null;

    return {
      conversation,
      assigned_staff_id: assignedStaffId,
      customer: customerInfo,
      orders,
      messages: formattedMessages,
      pagination: {
        limit: fetchLimit,
        has_more: messagesResult.has_more,
        next_cursor: messagesResult.next_cursor,
        oldest_message_id: messagesResult.oldest_message_id,
        total_returned: formattedMessages.length,
      },
    };
  },

  // Lấy danh sách tin nhắn theo từng khách hàng (10 tin nhắn gần nhất, hỗ trợ phân trang before khi kéo lên)
  getCustomerMessages: async (user, customerId, { before, limit = 10 } = {}) => {
    if (!customerId) {
      throw { status: 400, message: "Mã khách hàng không được để trống!" };
    }

    // Nếu người dùng là khách hàng, họ chỉ được xem tin nhắn của chính mình
    if (user.role === "customer" && String(user.accountId) !== String(customerId)) {
      throw { status: 403, message: "Bạn không được truy cập tin nhắn của khách hàng khác!" };
    }

    // Nếu không phải khách hàng, yêu cầu quyền chat:view
    if (user.role !== "customer") {
      requirePermission(user, "chat:view");
    }

    const fetchLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 10;

    // Tìm cuộc hội thoại hiện tại hoặc tất cả cuộc hội thoại của khách hàng
    const conversation = await ConversationModel.findByCustomerId(customerId);
    const conversationIds = await ConversationModel.findAllIdsByCustomerId(customerId);

    // Lấy thông tin khách hàng và 3 đơn hàng gần đây trong 2 tháng (dành cho nhân viên)
    const [customerInfo, orders] = await Promise.all([
      CustomerModel.findByAccountId(customerId, conversation?.customer_name || "Khách hàng"),
      user.role !== "customer" ? getCustomerOrders(customerId) : Promise.resolve([]),
    ]);

    let messagesResult;
    if (conversationIds.length > 0) {
      messagesResult = await MessageModel.findByCustomer(customerId, conversationIds, before, fetchLimit);
    } else {
      messagesResult = {
        messages: [],
        has_more: false,
        next_cursor: null,
        oldest_message_id: null,
        total_returned: 0,
      };
    }

    const formattedMessages = (messagesResult.messages || []).map((msg) => ({
      ...msg,
      sender_role:
        msg.sender_id === customerId
          ? "customer"
          : msg.sender_type === "ai"
            ? "ai"
            : "staff",
      is_read: Boolean(msg.is_read) || msg.status === "seen",
    }));

    const staffMsg = formattedMessages.find((m) => m.sender_role === "staff");
    const assignedStaffId = conversation?.assigned_staff_id || staffMsg?.sender_id || null;

    return {
      conversation: conversation || {
        conversation_id: null,
        customer_id: customerId,
        customer_name: customerInfo?.full_name || "Khách hàng",
        status: "waiting",
      },
      assigned_staff_id: assignedStaffId,
      customer: customerInfo,
      orders,
      messages: formattedMessages,
      pagination: {
        limit: fetchLimit,
        has_more: messagesResult.has_more,
        next_cursor: messagesResult.next_cursor,
        oldest_message_id: messagesResult.oldest_message_id,
        total_returned: formattedMessages.length,
      },
    };
  },
};


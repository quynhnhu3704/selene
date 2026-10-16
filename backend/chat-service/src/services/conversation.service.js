import crypto from "node:crypto";
import { ConversationModel } from "../models/conversation.model.js";
import { CustomerModel } from "../models/customer.model.js";
import { MessageModel } from "../models/message.model.js";
import { getCustomerOrders } from "./order.service.js";

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
    const cleanId = id != null ? String(id).trim() : "";
    if (!cleanId) {
      throw { status: 400, message: "Mã hội thoại hoặc mã khách hàng không hợp lệ!" };
    }
    // 1. Thử tìm theo conversation_id
    let conversation = await ConversationModel.findById(cleanId);

    // 2. Nếu không tìm thấy, thử tìm theo customer_id
    if (!conversation) {
      conversation = await ConversationModel.findByCustomerId(id);
    }

    if (!conversation) {
      throw { status: 404, message: "Không tìm thấy hội thoại của khách hàng này!" };
    }

    if (user.role === "customer" && String(conversation.customer_id) !== String(user.accountId)) {
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

  /**
   * Chức năng nhận xử lý cuộc trò chuyện:
   * - Chuyển trạng thái cuộc hội thoại sang 'active' (hoặc 'processing')
   * - Gán assigned_staff_id là nhân viên hiện tại
   * - Tự động gửi 1 tin nhắn chào loại text: "Chào bạn, mình là <tên nhân viên đang nhận> xin được hỗ trợ bạn"
   *
   * @param {Object} user - Nhân viên hoặc admin thực hiện thao tác
   * @param {string} conversationId - ID cuộc trò chuyện
   * @param {Object} options - { staff_name, content }
   */
  assignConversation: async (user, conversationId, { staff_name, content } = {}) => {
    requirePermission(user, "chat:assign");

    if (!conversationId || typeof conversationId !== "string") {
      throw { status: 400, message: "Mã hội thoại không hợp lệ!" };
    }

    const conversation = await ConversationService.getAccessible(user, conversationId);
    if (!conversation) {
      throw { status: 404, message: "Không tìm thấy cuộc trò chuyện!" };
    }

    const staffId = String(user?.accountId || user?.account_id || user?.id || "");
    if (!staffId) {
      throw { status: 401, message: "Không xác định được thông tin nhân viên tiếp nhận!" };
    }

    // 1. Xác định tên hiển thị của nhân viên tiếp nhận
    let staffName = staff_name || user?.full_name || user?.name || user?.username || "";
    if (!staffName || staffName === "Khách hàng" || staffName === "Admin") {
      try {
        const staffProfile = await CustomerModel.findByAccountId(staffId);
        if (staffProfile?.full_name && staffProfile.full_name !== "Khách hàng") {
          staffName = staffProfile.full_name;
        }
      } catch (err) {
        console.warn("[assignConversation] Could not fetch staff profile:", err.message);
      }
    }
    if (!staffName) {
      staffName = user.role === "admin" ? "Quản trị viên" : "Nhân viên hỗ trợ";
    }

    const now = new Date().toISOString();

    // 2. Nội dung tin nhắn chào tự động theo đúng yêu cầu
    const greetingText =
      content && typeof content === "string" && content.trim()
        ? content.trim()
        : `Chào bạn, mình là ${staffName} xin được hỗ trợ bạn`;

    const cleanGreeting = greetingText.trim().toLowerCase();

    // 2.1 Kiểm tra xem tin nhắn mới nhất có trùng với tin nhắn xin chào này không
    let isDuplicateGreeting = false;
    try {
      const latestMsg = await MessageModel.findLatestByConversation(conversation.conversation_id);
      if (latestMsg?.content) {
        isDuplicateGreeting = latestMsg.content.trim().toLowerCase() === cleanGreeting;
      } else if (conversation.last_message) {
        isDuplicateGreeting = conversation.last_message.trim().toLowerCase() === cleanGreeting;
      }
    } catch (err) {
      console.warn("[assignConversation] Could not check latest message:", err.message);
      if (conversation.last_message) {
        isDuplicateGreeting = conversation.last_message.trim().toLowerCase() === cleanGreeting;
      }
    }

    // 3. Cập nhật trạng thái cuộc hội thoại thành 'processing' (hoặc 'active') và gán assigned_staff_id
    let updatedConv = null;
    try {
      updatedConv = await ConversationModel.update(conversation.conversation_id, {
        status: "processing",
        assigned_staff_id: staffId,
      });
    } catch (err) {
      console.warn("[assignConversation] Processing status failed, retrying with active:", err.message);
      try {
        updatedConv = await ConversationModel.update(conversation.conversation_id, {
          status: "active",
          assigned_staff_id: staffId,
        });
      } catch (err2) {
        console.error("[assignConversation] Failed to update conversation status:", err2.message);
        throw { status: 500, message: "Không thể cập nhật trạng thái cuộc trò chuyện!" };
      }
    }

    // 4. Thêm / cập nhật nhân viên vào bảng conversation_participants
    try {
      await ConversationModel.upsertParticipant({
        conversation_id: conversation.conversation_id,
        account_id: staffId,
        role: user.role === "admin" ? "admin" : "staff",
        last_read_at: now,
      });
    } catch (err) {
      console.warn("[assignConversation] Warning upserting participant:", err.message);
    }

    let formattedMessage = null;
    let messageCreatedAt = now;

    // 5. Nếu tin nhắn xin chào không bị trùng lặp, tiến hành gửi tin nhắn chào mặc định
    if (!isDuplicateGreeting) {
      const messageId = crypto.randomUUID();
      let createdMessage = null;
      try {
        createdMessage = await MessageModel.create({
          messageId,
          conversationId: conversation.conversation_id,
          senderId: staffId,
          senderType: "user",
          messageType: "text",
          content: greetingText,
          status: "sent",
        });
      } catch (err) {
        console.error("[assignConversation] Error creating greeting message:", err.message);
        throw { status: 500, message: "Không thể tạo tin nhắn chào tự động!" };
      }

      messageCreatedAt = createdMessage?.created_at || now;

      // 6. Cập nhật last_message, last_message_id, last_message_at vào cuộc hội thoại
      try {
        await ConversationModel.update(conversation.conversation_id, {
          last_message_id: createdMessage.message_id,
          last_message: greetingText,
          last_message_at: messageCreatedAt,
        });
        if (updatedConv) {
          updatedConv.last_message_id = createdMessage.message_id;
          updatedConv.last_message = greetingText;
          updatedConv.last_message_at = messageCreatedAt;
        }
      } catch (err) {
        console.warn("[assignConversation] Warning updating conversation last_message:", err.message);
      }

      // 7. Cập nhật tin nhắn đã đọc gần nhất cho nhân viên
      try {
        await ConversationModel.upsertParticipant({
          conversation_id: conversation.conversation_id,
          account_id: staffId,
          role: user.role === "admin" ? "admin" : "staff",
          last_read_message_id: createdMessage.message_id,
          last_read_at: messageCreatedAt,
        });
      } catch (err) {
        console.warn("[assignConversation] Warning updating staff last_read:", err.message);
      }

      // 8. Định dạng dữ liệu tin nhắn trả về
      formattedMessage = {
        message_id: createdMessage.message_id,
        conversation_id: conversation.conversation_id,
        sender_id: staffId,
        sender_type: "user",
        sender_role: user.role === "admin" ? "admin" : "staff",
        message_type: "text",
        content: greetingText,
        attachments: [],
        reply_to_message_id: null,
        status: "sent",
        is_read: true,
        created_at: messageCreatedAt,
        updated_at: messageCreatedAt,
      };
    }

    const finalConversation = {
      ...(conversation || {}),
      ...(updatedConv || {}),
      status: updatedConv?.status || "processing",
      assigned_staff_id: staffId,
      ...(formattedMessage
        ? {
            last_message_id: formattedMessage.message_id,
            last_message: greetingText,
            last_message_at: messageCreatedAt,
          }
        : {}),
    };

    return {
      conversation: finalConversation,
      message: formattedMessage,
      staff_name: staffName,
      is_duplicate_greeting: isDuplicateGreeting,
    };
  },

  // Đóng cuộc trò chuyện (chuyển trạng thái sang 'closed')
  closeConversation: async (user, conversationId) => {
    requirePermission(user, "chat:close");

    const cleanId = String(conversationId || "").trim();
    if (!cleanId) {
      throw { status: 400, message: "Mã cuộc trò chuyện không hợp lệ!" };
    }

    const conversation = await ConversationService.getAccessible(user, cleanId);
    if (!conversation) {
      throw { status: 404, message: "Không tìm thấy cuộc trò chuyện!" };
    }

    // Nếu cuộc trò chuyện đã đóng thì trả về hội thoại hiện tại một cách an toàn (idempotent)
    if (conversation.status === "closed") {
      const fullExisting = await ConversationModel.findById(conversation.conversation_id);
      return fullExisting || conversation;
    }

    // Cập nhật trạng thái cuộc hội thoại sang 'closed'
    const now = new Date().toISOString();
    let updated = null;
    try {
      updated = await ConversationModel.update(conversation.conversation_id, {
        status: "closed",
      });
    } catch (err) {
      console.error("[closeConversation] Error updating status to closed:", err.message);
      throw { status: 500, message: "Không thể cập nhật trạng thái đóng cuộc trò chuyện!" };
    }

    // Lấy lại đầy đủ thông tin chi tiết cuộc hội thoại sau khi cập nhật
    const fullConversation = await ConversationModel.findById(conversation.conversation_id);

    return (
      fullConversation || {
        ...conversation,
        ...(updated || {}),
        status: "closed",
        updated_at: now,
      }
    );
  },
};


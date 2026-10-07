import { ConversationService } from "../services/conversation.service.js";
import { MessageService } from "../services/message.service.js";
import { notifyConversation } from "../socket.js";

// Lấy danh sách các cuộc trò chuyện
export const getConversations = async (req, res, next) => {
  try {
    const { status, search, order } = req.query;
    const user = req.user;

    const result = await ConversationService.getConversations(user, {
      status,
      search,
      order,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách cuộc trò chuyện thành công!",
      data: result.conversations,
      summary: result.summary,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách 10 tin nhắn mới nhất kèm thông tin khách hàng và đơn hàng 2 tháng gần đây theo ID cuộc hội thoại (conversation_id)
export const getConversationDetails = async (req, res, next) => {
  try {
    // ID ở URL là conversation_id (ID cuộc hội thoại được chọn) hoặc customer_id
    const conversationId = req.params.conversationId || req.params.id;
    const { before, limit } = req.query;
    const user = req.user;

    const result = await ConversationService.getConversationDetails(user, conversationId, {
      before,
      limit: limit ? Number(limit) : 10,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin cuộc trò chuyện và tin nhắn thành công!",
      data: {
        conversation_id: result.conversation.conversation_id, // ID cuộc hội thoại
        customer_id: result.conversation.customer_id,         // ID khách hàng
        customer_name: result.customer?.full_name || result.conversation.customer_name,
        assigned_staff_id: result.assigned_staff_id || result.conversation.assigned_staff_id || null,
        status: result.conversation.status,
        customer: {
          account_id: result.customer?.account_id || result.conversation.customer_id,
          profile_id: result.customer?.profile_id || null,
          full_name: result.customer?.full_name || result.conversation.customer_name || "Khách hàng",
          email: result.customer?.email || "Chưa có email",
          phone_number: result.customer?.phone_number || "Chưa có số điện thoại",
          avatar_url: result.customer?.avatar_url || null,
        },
        orders: result.orders,     // 3 đơn hàng gần đây nhất (trong 2 tháng)
        messages: result.messages, // Danh sách 10 tin nhắn mới nhất
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách tin nhắn theo từng khách hàng (mỗi lần 10 tin nhắn gần nhất, khi kéo lên thì lấy thêm)
export const getCustomerMessages = async (req, res, next) => {
  try {
    const customerId = req.params.customerId;
    const { before, limit } = req.query;
    const user = req.user;

    const result = await ConversationService.getCustomerMessages(user, customerId, {
      before,
      limit: limit ? Number(limit) : 10,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách tin nhắn theo khách hàng thành công!",
      data: {
        conversation_id: result.conversation.conversation_id,
        customer_id: result.customer?.account_id || customerId,
        customer_name: result.customer?.full_name || result.conversation.customer_name,
        assigned_staff_id: result.assigned_staff_id || null,
        status: result.conversation.status,
        customer: {
          account_id: result.customer?.account_id || customerId,
          profile_id: result.customer?.profile_id || null,
          full_name: result.customer?.full_name || result.conversation.customer_name || "Khách hàng",
          email: result.customer?.email || "Chưa có email",
          phone_number: result.customer?.phone_number || "Chưa có số điện thoại",
          avatar_url: result.customer?.avatar_url || null,
        },
        orders: result.orders,
        messages: result.messages,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Khách hàng tự lấy danh sách tin nhắn của chính mình (10 tin mới nhất, kéo lên lấy tiếp)
export const getMyMessages = async (req, res, next) => {
  try {
    const customerId = req.user?.accountId || req.user?.account_id || req.user?.id;
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin tài khoản người dùng!",
      });
    }
    const { before, limit } = req.query;
    const user = req.user;

    const result = await ConversationService.getCustomerMessages(user, String(customerId), {
      before,
      limit: limit ? Number(limit) : 10,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách tin nhắn thành công!",
      data: {
        conversation_id: result.conversation.conversation_id,
        customer_id: customerId,
        customer_name: result.customer?.full_name || result.conversation.customer_name,
        status: result.conversation.status,
        messages: result.messages,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Gửi 1 tin nhắn loại text
// - Nếu chưa có cuộc hội thoại thì tạo cuộc hội thoại mới và tạo tin nhắn mới
// - Nếu có đoạn hội thoại rồi thì chỉ cần thêm tin nhắn mới vào hội thoại
export const sendTextMessage = async (req, res, next) => {
  try {
    const user = req.user;
    const conversationId =
      req.params.conversationId ||
      req.params.id ||
      req.body.conversation_id ||
      req.body.conversationId ||
      null;

    const {
      content,
      customer_id,
      customerId,
      reply_to_message_id,
      replyToMessageId,
      sender_type,
    } = req.body;

    const result = await MessageService.sendTextMessage(user, {
      conversation_id: conversationId,
      customer_id: customer_id || customerId,
      content,
      reply_to_message_id: reply_to_message_id || replyToMessageId,
      sender_type,
    });

    // Phát sự kiện realtime qua Socket.IO nếu có kết nối
    const io = req.app.get("io");
    if (io) {
      try {
        io.to(`conversation:${result.conversation.conversation_id}`).emit(
          "message:new",
          result.message
        );
        notifyConversation(io, result.conversation);
      } catch (socketErr) {
        console.warn("[sendTextMessage] Socket emission warning:", socketErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: result.is_new_conversation
        ? "Đã tạo cuộc hội thoại mới và gửi tin nhắn thành công!"
        : "Gửi tin nhắn thành công!",
      data: {
        message: result.message,
        conversation: result.conversation,
        is_new_conversation: result.is_new_conversation,
      },
    });
  } catch (error) {
    next(error);
  }
};



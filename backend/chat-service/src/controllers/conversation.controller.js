import { ConversationService } from "../services/conversation.service.js";

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
    // ID ở URL là conversation_id (ID cuộc hội thoại được chọn)
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


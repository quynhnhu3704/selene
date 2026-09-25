import { ConversationService } from "../services/conversation.service.js";

// Lấy danh sách các cuộc trò chuyện
export const getConversations = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const user = req.user;

    const result = await ConversationService.getConversations(user, {
      status,
      search,
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

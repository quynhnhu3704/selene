import { ReactionService } from "../services/reaction.service.js";
import { notifyConversation } from "../socket.js";

/**
 * Thả / Đổi / Bật tắt reaction cho tin nhắn
 * (1 tin nhắn có thể có nhiều reaction từ nhiều tài khoản, mỗi tài khoản được thả 1 reaction)
 * POST /api/chat/messages/:messageId/reaction
 */
export const reactToMessage = async (req, res, next) => {
  try {
    const user = req.user;
    const messageId = req.params.messageId || req.params.id;
    const { reaction, emoji } = req.body;

    const result = await ReactionService.reactToMessage(
      user,
      messageId,
      reaction || emoji
    );

    // Phát sự kiện realtime qua Socket.IO tới toàn bộ thành viên trong phòng chat
    const io = req.app.get("io");
    if (io) {
      try {
        io.to(`conversation:${result.conversation_id}`).emit("message:reaction", {
          action: result.action,
          message_id: result.message_id,
          conversation_id: result.conversation_id,
          account_id: result.account_id,
          reaction: result.reaction,
          reaction_id: result.reaction_id,
          reactions: result.reactions,
          summary: result.summary,
        });

        if (result.conversation) {
          notifyConversation(io, result.conversation);
        }
      } catch (socketErr) {
        console.warn("[reactToMessage] Socket emission warning:", socketErr.message);
      }
    }

    let successMessage = "Thả biểu cảm thành công!";
    if (result.action === "removed") {
      successMessage = "Đã gỡ biểu cảm khỏi tin nhắn!";
    } else if (result.action === "updated") {
      successMessage = "Đã cập nhật biểu cảm tin nhắn!";
    }

    return res.status(200).json({
      success: true,
      message: successMessage,
      data: {
        action: result.action,
        message_id: result.message_id,
        conversation_id: result.conversation_id,
        account_id: result.account_id,
        reaction: result.reaction,
        reaction_id: result.reaction_id,
        reactions: result.reactions,
        summary: result.summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Hủy biểu cảm của người dùng trên tin nhắn
 * DELETE /api/chat/messages/:messageId/reaction
 */
export const removeReaction = async (req, res, next) => {
  try {
    const user = req.user;
    const messageId = req.params.messageId || req.params.id;

    const result = await ReactionService.removeReaction(user, messageId);

    const io = req.app.get("io");
    if (io) {
      try {
        io.to(`conversation:${result.conversation_id}`).emit("message:reaction", {
          action: "removed",
          message_id: result.message_id,
          conversation_id: result.conversation_id,
          account_id: result.account_id,
          reaction: null,
          reaction_id: null,
          reactions: result.reactions,
          summary: result.summary,
        });

        if (result.conversation) {
          notifyConversation(io, result.conversation);
        }
      } catch (socketErr) {
        console.warn("[removeReaction] Socket emission warning:", socketErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Đã gỡ biểu cảm khỏi tin nhắn thành công!",
      data: {
        action: "removed",
        message_id: result.message_id,
        conversation_id: result.conversation_id,
        account_id: result.account_id,
        reaction: null,
        reaction_id: null,
        reactions: result.reactions,
        summary: result.summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lấy danh sách toàn bộ các biểu cảm của một tin nhắn
 * GET /api/chat/messages/:messageId/reaction
 */
export const getMessageReactions = async (req, res, next) => {
  try {
    const user = req.user;
    const messageId = req.params.messageId || req.params.id;

    const result = await ReactionService.getMessageReactions(user, messageId);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách biểu cảm tin nhắn thành công!",
      data: result.reactions,
      summary: result.summary,
    });
  } catch (error) {
    next(error);
  }
};

export const getMessageReaction = getMessageReactions;

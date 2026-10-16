import { ReactionModel } from "../models/reaction.model.js";
import { MessageModel } from "../models/message.model.js";
import { ConversationService } from "./conversation.service.js";
import { CustomerModel } from "../models/customer.model.js";

export const ReactionService = {
  /**
   * Thả / Thay đổi / Bật tắt reaction cho tin nhắn
   * - 1 tin nhắn có thể có nhiều reaction từ nhiều account khác nhau.
   * - Mỗi account chỉ được thả 1 reaction trong 1 tin nhắn.
   * - Nếu bấm lại đúng icon của chính mình -> Gỡ reaction (toggle off).
   * - Nếu chọn icon khác -> Cập nhật icon mới của mình.
   * - Nếu chưa thả -> Thêm mới icon của mình.
   *
   * @param {Object} user - Người dùng hiện tại từ JWT token
   * @param {string} messageId - ID tin nhắn cần thả reaction
   * @param {string} reaction - Biểu tượng cảm xúc (ví dụ: ❤️, 👍, 😂, 😮, 😢, 😡)
   */
  reactToMessage: async (user, messageId, reaction) => {
    // 1. Xác thực người dùng
    const accountId = String(user?.accountId || user?.account_id || user?.id || "");
    if (!accountId) {
      throw { status: 401, message: "Không xác định được thông tin người dùng!" };
    }

    // 2. Kiểm tra messageId
    if (!messageId) {
      throw { status: 400, message: "Mã tin nhắn không được để trống!" };
    }

    // 3. Kiểm tra tính hợp lệ của biểu cảm
    if (typeof reaction !== "string" || !reaction.trim()) {
      throw { status: 400, message: "Biểu cảm (reaction) không được để trống!" };
    }
    const cleanReaction = reaction.trim();
    if (cleanReaction.length > 50) {
      throw { status: 400, message: "Biểu cảm không hợp lệ hoặc quá dài!" };
    }

    // 4. Tìm tin nhắn cần thả reaction
    const message = await MessageModel.findById(messageId);
    if (!message) {
      throw { status: 404, message: "Không tìm thấy tin nhắn để thả biểu cảm!" };
    }

    // 5. Kiểm tra quyền truy cập vào cuộc hội thoại của tin nhắn
    const conversation = await ConversationService.getAccessible(user, message.conversation_id);

    // 6. Kiểm tra reaction của tài khoản hiện tại trên tin nhắn này
    const existing = await ReactionModel.findByMessageAndAccount(message.message_id, accountId);

    let action = "added";
    let currentReaction = cleanReaction;
    let reactionId = null;

    if (existing) {
      if (existing.reaction === cleanReaction) {
        // Bấm lại đúng icon của chính mình -> Gỡ bỏ (toggle off)
        await ReactionModel.delete(existing.reaction_id);
        action = "removed";
        currentReaction = null;
        reactionId = null;
      } else {
        // Cập nhật sang icon mới
        const updated = await ReactionModel.update(existing.reaction_id, {
          reaction: cleanReaction,
        });
        action = "updated";
        currentReaction = cleanReaction;
        reactionId = updated?.reaction_id || existing.reaction_id;
      }
    } else {
      // Tài khoản này chưa thả icon trên tin nhắn -> Thêm mới
      const created = await ReactionModel.create({
        messageId: message.message_id,
        accountId,
        reaction: cleanReaction,
      });
      action = "added";
      currentReaction = cleanReaction;
      reactionId = created?.reaction_id;
    }

    // 7. Lấy toàn bộ danh sách reactions mới nhất của tin nhắn (từ tất cả các tài khoản)
    const updatedReactions = await ReactionModel.findByMessageId(message.message_id);
    const summary = ReactionModel.buildSummary(updatedReactions);

    return {
      action,
      message_id: message.message_id,
      conversation_id: message.conversation_id,
      account_id: accountId,
      reaction: currentReaction,
      reaction_id: reactionId,
      reactions: updatedReactions,
      summary,
      conversation,
    };
  },

  /**
   * Hủy biểu cảm của tài khoản trên tin nhắn
   */
  removeReaction: async (user, messageId) => {
    const accountId = String(user?.accountId || user?.account_id || user?.id || "");
    if (!accountId) {
      throw { status: 401, message: "Không xác định được thông tin người dùng!" };
    }

    if (!messageId) {
      throw { status: 400, message: "Mã tin nhắn không được để trống!" };
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      throw { status: 404, message: "Không tìm thấy tin nhắn!" };
    }

    const conversation = await ConversationService.getAccessible(user, message.conversation_id);

    await ReactionModel.deleteByMessageAndAccount(message.message_id, accountId);

    const updatedReactions = await ReactionModel.findByMessageId(message.message_id);
    const summary = ReactionModel.buildSummary(updatedReactions);

    return {
      action: "removed",
      message_id: message.message_id,
      conversation_id: message.conversation_id,
      account_id: accountId,
      reaction: null,
      reaction_id: null,
      reactions: updatedReactions,
      summary,
      conversation,
    };
  },

  /**
   * Lấy chi tiết toàn bộ các biểu cảm của một tin nhắn kèm thông tin người thả
   */
  getMessageReactions: async (user, messageId) => {
    if (!messageId) {
      throw { status: 400, message: "Mã tin nhắn không được để trống!" };
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      throw { status: 404, message: "Không tìm thấy tin nhắn!" };
    }

    const conversation = await ConversationService.getAccessible(user, message.conversation_id);
    const rawReactions = await ReactionModel.findByMessageId(message.message_id);

    // Bổ sung thông tin tên / avatar người thả biểu cảm theo đúng các trường yêu cầu
    const enhancedReactions = await Promise.all(
      rawReactions.map(async (r) => {
        const isCustomer = String(r.account_id) === String(conversation.customer_id);
        const fallbackName = isCustomer
          ? conversation.customer_name || "Khách hàng"
          : "Người dùng";
        let reactorName = fallbackName;
        let reactorAvatar = null;

        try {
          const profile = await CustomerModel.findByAccountId(r.account_id, fallbackName);
          if (profile?.full_name) reactorName = profile.full_name;
          if (profile?.avatar_url) reactorAvatar = profile.avatar_url;
        } catch {}

        return {
          account_id: String(r.account_id),
          reaction: r.reaction,
          user_name: reactorName,
          user_avatar: reactorAvatar,
          is_customer: isCustomer,
        };
      })
    );

    const summary = ReactionModel.buildSummary(rawReactions);

    return {
      reactions: enhancedReactions,
      summary,
    };
  },
};

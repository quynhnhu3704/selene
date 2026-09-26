import { MessageModel } from "../models/message.model.js";
import {
  ConversationService,
  requirePermission,
} from "./conversation.service.js";

export const MessageService = {
  getMessages: async (user, id, { before, limit = 50 }) => {
    await ConversationService.getAccessible(user, id);
    limit = Number(limit);
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      (before && !/^\d+$/.test(String(before)))
    ) {
      throw { status: 400, message: "Phân trang tin nhắn không hợp lệ!" };
    }
    return MessageModel.findByConversation(id, before, limit);
  },

  send: async (user, id, data) => {
    const { content, client_id: clientId } = data || {};
    const conversation = await ConversationService.getAccessible(user, id);
    if (conversation.status === "closed")
      throw { status: 409, message: "Hội thoại đã đóng!" };
    if (user.role !== "customer") {
      requirePermission(user, "chat:reply");
      if (conversation.assigned_staff_id !== user.accountId) {
        throw {
          status: 409,
          message: "Bạn cần nhận xử lý hội thoại trước khi trả lời!",
        };
      }
    }
    if (
      typeof content !== "string" ||
      !content.trim() ||
      content.trim().length > 2000 ||
      typeof clientId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        clientId,
      )
    ) {
      throw {
        status: 400,
        message: "Tin nhắn phải có từ 1 đến 2000 ký tự và mã gửi hợp lệ!",
      };
    }
    return MessageModel.create(id, user.accountId, content.trim(), clientId);
  },

  read: async (user, id, throughId) => {
    const conversation = await ConversationService.getAccessible(user, id);
    if (!/^\d+$/.test(String(throughId)))
      throw { status: 400, message: "Mã tin nhắn không hợp lệ!" };
    return MessageModel.markRead(
      id,
      conversation.customer_id,
      user.role === "customer",
      throughId,
    );
  },
};

import { supabase } from "../configs/supabase.js";

export const MessageModel = {
  /**
   * Lấy danh sách tin nhắn theo cuộc trò chuyện (mặc định 10 tin nhắn mới nhất)
   * Khớp đúng bảng chat.messages:
   * message_id, conversation_id, sender_id, sender_type, message_type, content, reply_to_message_id, status, created_at, updated_at
   * 
   * @param {string} conversationId - ID cuộc trò chuyện
   * @param {string|null} before - con trỏ thời gian created_at hoặc message_id để tải tin cũ hơn
   * @param {number} limit - số lượng tin nhắn (mặc định 10)
   */
  findByConversation: async (conversationId, before = null, limit = 10) => {
    const fetchLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 10;

    let query = supabase
      .from("messages")
      .select(
        `
        message_id,
        conversation_id,
        sender_id,
        sender_type,
        message_type,
        content,
        reply_to_message_id,
        status,
        created_at,
        updated_at
      `
      )
      .eq("conversation_id", conversationId);

    // Xử lý phân trang theo con trỏ thời gian tạo (created_at)
    if (before) {
      if (!isNaN(Date.parse(before))) {
        query = query.lt("created_at", new Date(before).toISOString());
      } else {
        // Nếu truyền vào message_id, lấy created_at của message đó để so sánh lùi
        const { data: targetMsg } = await supabase
          .from("messages")
          .select("created_at")
          .eq("message_id", before)
          .maybeSingle();

        if (targetMsg?.created_at) {
          query = query.lt("created_at", targetMsg.created_at);
        }
      }
    }

    // Sắp xếp thời gian giảm dần để lấy các tin mới nhất (lấy limit + 1 để xác định has_more)
    query = query.order("created_at", { ascending: false }).limit(fetchLimit + 1);

    const { data, error } = await query;
    if (error) throw error;

    const rawMessages = data || [];
    const hasMore = rawMessages.length > fetchLimit;
    const items = hasMore ? rawMessages.slice(0, fetchLimit) : rawMessages;

    // Sắp xếp lại theo thời gian tăng dần (cũ -> mới) cho hiển thị khung chat
    items.reverse();

    return {
      messages: items,
      has_more: hasMore,
      next_cursor: items.length > 0 ? items[0].created_at : null,
      oldest_message_id: items.length > 0 ? items[0].message_id : null,
      total_returned: items.length,
    };
  },

  /**
   * Tạo tin nhắn mới vào bảng chat.messages
   */
  create: async ({
    conversationId,
    senderId,
    content,
    senderType = "user",
    messageType = "text",
    replyToMessageId = null,
  }) => {
    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          conversation_id: conversationId,
          sender_id: senderId,
          sender_type: senderType,
          message_type: messageType,
          content: content,
          reply_to_message_id: replyToMessageId,
          status: "sent",
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Cập nhật trạng thái đã xem (status = 'seen')
   */
  markRead: async (conversationId, readerAccountId) => {
    let query = supabase
      .from("messages")
      .update({ status: "seen", updated_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", readerAccountId)
      .eq("status", "sent");

    const { data, error } = await query.select();
    if (error) throw error;
    return data;
  },
};

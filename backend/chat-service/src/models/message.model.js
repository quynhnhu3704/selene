import { supabase } from "../configs/supabase.js";

export const MessageModel = {
  /**
   * Lấy danh sách tin nhắn theo cuộc trò chuyện (mặc định 10 tin nhắn mới nhất)
   * Khớp đúng bảng messages:
   * message_id, conversation_id, sender_id, sender_type, message_type, content, reply_to_message_id, status, created_at, updated_at
   * 
   * @param {string} conversationId - ID cuộc trò chuyện
   * @param {string|null} before - con trỏ thời gian created_at hoặc message_id để tải tin cũ hơn khi kéo lên
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

    // Xử lý phân trang theo con trỏ thời gian tạo (created_at) hoặc message_id
    if (before) {
      if (!isNaN(Date.parse(before))) {
        query = query.lt("created_at", new Date(before).toISOString());
      } else {
        // Nếu truyền vào message_id, lấy created_at của message đó để so sánh lùi
        const { data: targetMsg } = await supabase
          .from("messages")
          .select("created_at, message_id")
          .eq("message_id", before)
          .maybeSingle();

        if (targetMsg?.created_at) {
          query = query.lt("created_at", targetMsg.created_at);
        } else {
          query = query.lt("message_id", before);
        }
      }
    }

    // Sắp xếp thời gian giảm dần để lấy các tin mới nhất (lấy fetchLimit + 1 để kiểm tra has_more)
    query = query
      .order("created_at", { ascending: false })
      .order("message_id", { ascending: false })
      .limit(fetchLimit + 1);

    const { data, error } = await query;
    if (error) throw error;

    const rawMessages = data || [];
    const hasMore = rawMessages.length > fetchLimit;
    const items = hasMore ? rawMessages.slice(0, fetchLimit) : rawMessages;

    // Sắp xếp lại theo thời gian tăng dần (cũ -> mới) cho hiển thị khung chat từ trên xuống
    items.reverse();

    const formattedMessages = items.map((msg) => ({
      message_id: msg.message_id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      sender_type: msg.sender_type || "user",
      message_type: msg.message_type || "text",
      content: msg.content,
      reply_to_message_id: msg.reply_to_message_id || null,
      status: msg.status || "sent",
      is_read: msg.status === "seen",
      created_at: msg.created_at,
      updated_at: msg.updated_at || msg.created_at,
    }));

    return {
      messages: formattedMessages,
      has_more: hasMore,
      next_cursor: formattedMessages.length > 0 ? formattedMessages[0].created_at : null,
      oldest_message_id: formattedMessages.length > 0 ? formattedMessages[0].message_id : null,
      total_returned: formattedMessages.length,
    };
  },

  /**
   * Lấy danh sách tin nhắn theo từng khách hàng (mỗi lần 10 tin nhắn gần nhất)
   * Phân trang qua con trỏ before khi người dùng kéo lên
   */
  findByCustomer: async (customerId, conversationIds = [], before = null, limit = 10) => {
    const fetchLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 10;

    if (!conversationIds || conversationIds.length === 0) {
      return {
        messages: [],
        has_more: false,
        next_cursor: null,
        oldest_message_id: null,
        total_returned: 0,
      };
    }

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
      .in("conversation_id", conversationIds);

    // Xử lý phân trang theo con trỏ before (thời gian hoặc message_id)
    if (before) {
      if (!isNaN(Date.parse(before))) {
        query = query.lt("created_at", new Date(before).toISOString());
      } else {
        const { data: targetMsg } = await supabase
          .from("messages")
          .select("created_at, message_id")
          .eq("message_id", before)
          .maybeSingle();

        if (targetMsg?.created_at) {
          query = query.lt("created_at", targetMsg.created_at);
        } else {
          query = query.lt("message_id", before);
        }
      }
    }

    query = query
      .order("created_at", { ascending: false })
      .order("message_id", { ascending: false })
      .limit(fetchLimit + 1);

    const { data, error } = await query;
    if (error) throw error;

    const rawMessages = data || [];
    const hasMore = rawMessages.length > fetchLimit;
    const items = hasMore ? rawMessages.slice(0, fetchLimit) : rawMessages;

    // Đảo ngược lại theo thứ tự thời gian tăng dần (cũ -> mới)
    items.reverse();

    const formattedMessages = items.map((msg) => ({
      message_id: msg.message_id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      sender_type: msg.sender_type || (msg.sender_id === customerId ? "user" : "staff"),
      message_type: msg.message_type || "text",
      content: msg.content,
      reply_to_message_id: msg.reply_to_message_id || null,
      status: msg.status || "sent",
      is_read: msg.status === "seen",
      created_at: msg.created_at,
      updated_at: msg.updated_at || msg.created_at,
    }));

    return {
      messages: formattedMessages,
      has_more: hasMore,
      next_cursor: formattedMessages.length > 0 ? formattedMessages[0].created_at : null,
      oldest_message_id: formattedMessages.length > 0 ? formattedMessages[0].message_id : null,
      total_returned: formattedMessages.length,
    };
  },

  /**
   * Tạo tin nhắn mới vào bảng messages
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

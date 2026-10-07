import crypto from "node:crypto";
import { supabase } from "../configs/supabase.js";
import { AttachmentModel } from "./attachment.model.js";

const MESSAGE_FIELDS = `
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
`;

/**
 * Chuẩn hóa 1 bản ghi tin nhắn từ database kết hợp danh sách attachments
 */
const formatMessageRow = (msg, attachments = [], defaultSenderRole = null) => {
  const firstAtt = attachments && attachments.length > 0 ? attachments[0] : null;

  let fileUrl = firstAtt?.file_url || null;
  let fileName = firstAtt?.file_name || null;
  let fileSize = firstAtt?.file_size ? Number(firstAtt.file_size) : null;
  let fileType = firstAtt?.file_type || null;
  let messageType = msg.message_type || "text";
  let displayContent = msg.content || "";

  // Dự phòng: Nếu content là JSON fallback
  if (!fileUrl && displayContent && typeof displayContent === "string" && displayContent.startsWith("{")) {
    try {
      const parsed = JSON.parse(displayContent);
      if (parsed.file_url || parsed.url) {
        fileUrl = parsed.file_url || parsed.url;
        fileName = parsed.file_name || parsed.name || null;
        fileSize = parsed.file_size || parsed.size || null;
        fileType = parsed.file_type || parsed.type || null;
        if (parsed.type && ["image", "video", "file", "audio"].includes(parsed.type)) {
          messageType = parsed.type;
        }
        displayContent = parsed.text || parsed.caption || fileName || (messageType === "image" ? "[Hình ảnh]" : messageType === "video" ? "[Video]" : "[Tệp đính kèm]");
      }
    } catch {}
  }

  // Tự động phân loại nếu có file đính kèm nhưng message_type vẫn là text
  if (fileUrl && messageType === "text") {
    const ext = (fileName || fileUrl).split(".").pop()?.split("?")[0]?.toLowerCase();
    const mime = (fileType || "").toLowerCase();
    if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) {
      messageType = "image";
    } else if (mime.startsWith("video/") || ["mp4", "mov", "webm", "mkv"].includes(ext)) {
      messageType = "video";
    } else {
      messageType = "file";
    }
  }

  return {
    message_id: msg.message_id,
    conversation_id: msg.conversation_id,
    sender_id: msg.sender_id,
    sender_type: msg.sender_type || defaultSenderRole || "user",
    message_type: messageType,
    content: displayContent,
    attachments: attachments,
    reply_to_message_id: msg.reply_to_message_id || null,
    status: msg.status || "sent",
    is_read: msg.status === "seen",
    created_at: msg.created_at,
    updated_at: msg.updated_at || msg.created_at,
  };
};

export const MessageModel = {
  /**
   * Lấy danh sách tin nhắn theo cuộc trò chuyện (kèm dữ liệu từ bảng message_attachments)
   * @param {string} conversationId - ID cuộc trò chuyện
   * @param {string|null} before - con trỏ thời gian created_at hoặc message_id
   * @param {number} limit - số lượng tin nhắn (mặc định 10)
   */
  findByConversation: async (conversationId, before = null, limit = 10) => {
    const fetchLimit = Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 10;

    let query = supabase
      .from("messages")
      .select(MESSAGE_FIELDS)
      .eq("conversation_id", conversationId);

    if (before) {
      if (!isNaN(Date.parse(before))) {
        query = query.lt("created_at", new Date(before).toISOString());
      } else {
        query = query.lt("message_id", before);
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

    // Đảo ngược lại theo thứ tự thời gian tăng dần (cũ -> mới) cho khung chat
    items.reverse();

    // 1. Lấy danh sách attachments tương ứng từ bảng message_attachments
    const messageIds = items.map((m) => String(m.message_id));
    const attachments = await AttachmentModel.findByMessageIds(messageIds);

    const attachmentsByMsgId = {};
    attachments.forEach((att) => {
      const mid = String(att.message_id);
      if (!attachmentsByMsgId[mid]) attachmentsByMsgId[mid] = [];
      attachmentsByMsgId[mid].push(att);
    });

    // 2. Gộp attachments vào từng tin nhắn
    const formattedMessages = items.map((msg) => {
      const msgAtts = attachmentsByMsgId[String(msg.message_id)] || [];
      return formatMessageRow(msg, msgAtts);
    });

    return {
      messages: formattedMessages,
      has_more: hasMore,
      next_cursor: formattedMessages.length > 0 ? formattedMessages[0].created_at : null,
      oldest_message_id: formattedMessages.length > 0 ? formattedMessages[0].message_id : null,
      total_returned: formattedMessages.length,
    };
  },

  /**
   * Lấy danh sách tin nhắn theo từng khách hàng (kèm dữ liệu từ bảng message_attachments)
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
      .select(MESSAGE_FIELDS)
      .in("conversation_id", conversationIds);

    if (before) {
      if (!isNaN(Date.parse(before))) {
        query = query.lt("created_at", new Date(before).toISOString());
      } else {
        query = query.lt("message_id", before);
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

    items.reverse();

    // Lấy attachments tương ứng từ bảng message_attachments
    const messageIds = items.map((m) => String(m.message_id));
    const attachments = await AttachmentModel.findByMessageIds(messageIds);

    const attachmentsByMsgId = {};
    attachments.forEach((att) => {
      const mid = String(att.message_id);
      if (!attachmentsByMsgId[mid]) attachmentsByMsgId[mid] = [];
      attachmentsByMsgId[mid].push(att);
    });

    const formattedMessages = items.map((msg) => {
      const msgAtts = attachmentsByMsgId[String(msg.message_id)] || [];
      return formatMessageRow(
        msg,
        msgAtts,
        msg.sender_id === customerId ? "user" : "staff"
      );
    });

    return {
      messages: formattedMessages,
      has_more: hasMore,
      next_cursor: formattedMessages.length > 0 ? formattedMessages[0].created_at : null,
      oldest_message_id: formattedMessages.length > 0 ? formattedMessages[0].message_id : null,
      total_returned: formattedMessages.length,
    };
  },

  /**
   * Tạo tin nhắn mới vào bảng messages và lưu tệp đính kèm vào bảng message_attachments
   */
  create: async ({
    messageId,
    conversationId,
    senderId,
    content,
    fileUrl = null,
    fileName = null,
    fileSize = null,
    fileType = null,
    senderType = "user",
    messageType = "text",
    replyToMessageId = null,
    status = "sent",
  }) => {
    const now = new Date().toISOString();
    const newMsgId = messageId || crypto.randomUUID();

    const insertPayload = {
      message_id: newMsgId,
      conversation_id: conversationId,
      sender_id: senderId || null,
      sender_type: senderType || "user",
      message_type: messageType || "text",
      content: content || fileName || (fileUrl ? "[Tệp đính kèm]" : "Tin nhắn"),
      reply_to_message_id: replyToMessageId || null,
      status: status || "sent",
      created_at: now,
      updated_at: now,
    };

    let { data, error } = await supabase
      .from("messages")
      .insert([insertPayload])
      .select()
      .single();

    // 1. Dự phòng trường hợp cột message_id trong database là GENERATED ALWAYS AS IDENTITY
    if (error && error.message?.includes("identity column")) {
      delete insertPayload.message_id;
      const retry = await supabase
        .from("messages")
        .insert([insertPayload])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    // 2. Dự phòng trường hợp ràng buộc CHECK (message_type = 'text') cũ trong DB
    if (
      error &&
      error.message?.includes("check constraint") &&
      (error.message?.includes("message_type") ||
        error.message?.includes("messages_message_type_check"))
    ) {
      insertPayload.message_type = "text";
      const retry = await supabase
        .from("messages")
        .insert([insertPayload])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    // 3. NẾU CÓ TỆP ĐÍNH KÈM: Lưu vào bảng message_attachments
    let savedAttachment = null;
    if (fileUrl && data?.message_id) {
      try {
        savedAttachment = await AttachmentModel.create({
          attachmentId: crypto.randomUUID(),
          messageId: String(data.message_id),
          fileUrl: fileUrl,
          fileName: fileName || "file",
          fileType: fileType || "application/octet-stream",
          fileSize: fileSize ? Number(fileSize) : null,
        });
      } catch (attError) {
        console.warn("[MessageModel.create] Warning saving attachment to message_attachments:", attError.message);
        // Lưu tạm attachment dạng object trả về cho client
        savedAttachment = {
          attachment_id: crypto.randomUUID(),
          message_id: String(data.message_id),
          file_url: fileUrl,
          file_name: fileName || "file",
          file_type: fileType || "application/octet-stream",
          file_size: fileSize ? Number(fileSize) : null,
          created_at: now,
        };
      }
    }

    const attachmentsList = savedAttachment ? [savedAttachment] : [];

    return {
      ...data,
      attachments: attachmentsList,
      message_type:
        data.message_type === "text" && messageType !== "text"
          ? messageType
          : data.message_type || messageType,
    };
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

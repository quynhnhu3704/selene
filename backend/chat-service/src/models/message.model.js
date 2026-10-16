import crypto from "node:crypto";
import { supabase } from "../configs/supabase.js";
import { AttachmentModel } from "./attachment.model.js";
import { ReactionModel } from "./reaction.model.js";

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
const formatMessageRow = (msg, attachments = [], defaultSenderRole = null, reactions = []) => {
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

  const reactionsList = Array.isArray(reactions) ? reactions : (reactions ? [reactions] : []);

  return {
    message_id: msg.message_id,
    conversation_id: msg.conversation_id,
    sender_id: msg.sender_id,
    sender_type: msg.sender_type || defaultSenderRole || "user",
    message_type: messageType,
    content: displayContent,
    attachments: attachments,
    reactions: reactionsList,
    reaction_summary: ReactionModel.buildSummary(reactionsList),
    reply_to_message_id: msg.reply_to_message_id || null,
    status: msg.status || "sent",
    is_read: msg.status === "seen",
    created_at: msg.created_at,
    updated_at: msg.updated_at || msg.created_at,
  };
};

/**
 * Gắn thêm thông tin của tin nhắn gốc (reply_to) vào danh sách tin nhắn
 */
const populateReplyMessages = async (formattedMessages = []) => {
  if (!Array.isArray(formattedMessages) || formattedMessages.length === 0) {
    return formattedMessages;
  }

  const replyIds = formattedMessages
    .map((m) => m.reply_to_message_id)
    .filter((id) => id !== null && id !== undefined && id !== "");

  if (replyIds.length === 0) {
    formattedMessages.forEach((m) => {
      m.reply_to = null;
    });
    return formattedMessages;
  }

  // 1. Tạo map từ danh sách hiện tại
  const replyMap = {};
  formattedMessages.forEach((m) => {
    replyMap[String(m.message_id)] = {
      message_id: m.message_id,
      conversation_id: m.conversation_id,
      sender_id: m.sender_id,
      sender_type: m.sender_type,
      message_type: m.message_type,
      content: m.content,
      attachments: m.attachments || [],
      created_at: m.created_at,
    };
  });

  // 2. Những ID chưa có trong batch hiện tại -> truy vấn thêm từ database
  const missingIds = replyIds.filter((id) => !replyMap[String(id)]);
  if (missingIds.length > 0) {
    try {
      const uniqueMissing = Array.from(new Set(missingIds.map(String)));
      const { data, error } = await supabase
        .from("messages")
        .select(MESSAGE_FIELDS)
        .in("message_id", uniqueMissing);

      if (!error && Array.isArray(data)) {
        let parentAtts = [];
        try {
          parentAtts = await AttachmentModel.findByMessageIds(uniqueMissing);
        } catch {}

        const attsByMsgId = {};
        parentAtts.forEach((att) => {
          const mid = String(att.message_id);
          if (!attsByMsgId[mid]) attsByMsgId[mid] = [];
          attsByMsgId[mid].push(att);
        });

        data.forEach((raw) => {
          const formatted = formatMessageRow(raw, attsByMsgId[String(raw.message_id)] || []);
          replyMap[String(raw.message_id)] = {
            message_id: formatted.message_id,
            conversation_id: formatted.conversation_id,
            sender_id: formatted.sender_id,
            sender_type: formatted.sender_type,
            message_type: formatted.message_type,
            content: formatted.content,
            attachments: formatted.attachments || [],
            created_at: formatted.created_at,
          };
        });
      }
    } catch (err) {
      console.warn("[populateReplyMessages] Warning loading parent messages:", err.message);
    }
  }

  // 3. Gán object reply_to vào từng tin nhắn
  formattedMessages.forEach((m) => {
    m.reply_to = m.reply_to_message_id ? (replyMap[String(m.reply_to_message_id)] || null) : null;
  });

  return formattedMessages;
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

    // 1. Lấy danh sách attachments và reactions tương ứng
    const messageIds = items.map((m) => String(m.message_id));
    const [attachments = [], reactions = []] = await Promise.all([
      AttachmentModel.findByMessageIds(messageIds),
      ReactionModel.findByMessageIds(messageIds),
    ]);

    const attachmentsByMsgId = {};
    (attachments || []).forEach((att) => {
      const mid = String(att.message_id);
      if (!attachmentsByMsgId[mid]) attachmentsByMsgId[mid] = [];
      attachmentsByMsgId[mid].push(att);
    });

    const reactionsByMsgId = {};
    (reactions || []).forEach((r) => {
      if (r && r.message_id) {
        const mid = String(r.message_id);
        if (!reactionsByMsgId[mid]) reactionsByMsgId[mid] = [];
        reactionsByMsgId[mid].push(r);
      }
    });

    // 2. Gộp attachments và reactions vào từng tin nhắn (1 tin nhắn có thể có nhiều reaction từ nhiều tài khoản)
    const formattedMessages = items.map((msg) => {
      const msgAtts = attachmentsByMsgId[String(msg.message_id)] || [];
      const msgReactions = reactionsByMsgId[String(msg.message_id)] || [];
      return formatMessageRow(msg, msgAtts, null, msgReactions);
    });

    // 3. Gắn thông tin tin nhắn được reply (nếu có)
    const messagesWithReply = await populateReplyMessages(formattedMessages);

    return {
      messages: messagesWithReply,
      has_more: hasMore,
      next_cursor: messagesWithReply.length > 0 ? messagesWithReply[0].created_at : null,
      oldest_message_id: messagesWithReply.length > 0 ? messagesWithReply[0].message_id : null,
      total_returned: messagesWithReply.length,
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

    // Lấy attachments và reactions tương ứng từ cơ sở dữ liệu
    const messageIds = items.map((m) => String(m.message_id));
    const [attachments = [], reactions = []] = await Promise.all([
      AttachmentModel.findByMessageIds(messageIds),
      ReactionModel.findByMessageIds(messageIds),
    ]);

    const attachmentsByMsgId = {};
    (attachments || []).forEach((att) => {
      const mid = String(att.message_id);
      if (!attachmentsByMsgId[mid]) attachmentsByMsgId[mid] = [];
      attachmentsByMsgId[mid].push(att);
    });

    const reactionsByMsgId = {};
    (reactions || []).forEach((r) => {
      if (r && r.message_id) {
        const mid = String(r.message_id);
        if (!reactionsByMsgId[mid]) reactionsByMsgId[mid] = [];
        reactionsByMsgId[mid].push(r);
      }
    });

    const formattedMessages = items.map((msg) => {
      const msgAtts = attachmentsByMsgId[String(msg.message_id)] || [];
      const msgReactions = reactionsByMsgId[String(msg.message_id)] || [];
      return formatMessageRow(
        msg,
        msgAtts,
        msg.sender_id === customerId ? "user" : "staff",
        msgReactions
      );
    });

    // Gắn thông tin tin nhắn được reply (nếu có)
    const messagesWithReply = await populateReplyMessages(formattedMessages);

    return {
      messages: messagesWithReply,
      has_more: hasMore,
      next_cursor: messagesWithReply.length > 0 ? messagesWithReply[0].created_at : null,
      oldest_message_id: messagesWithReply.length > 0 ? messagesWithReply[0].message_id : null,
      total_returned: messagesWithReply.length,
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

    // 3. Dự phòng trường hợp DB yêu cầu client_id NOT NULL
    if (error && error.message?.includes("client_id") && error.message?.includes("null")) {
      insertPayload.client_id = crypto.randomUUID();
      const retry = await supabase
        .from("messages")
        .insert([insertPayload])
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    // 4. Dự phòng trường hợp cột reply_to_message_id chưa tồn tại trong DB cũ
    if (
      error &&
      error.message?.includes("reply_to_message_id") &&
      (error.message?.includes("column") || error.message?.includes("does not exist"))
    ) {
      delete insertPayload.reply_to_message_id;
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
      reactions: [],
      reaction_summary: ReactionModel.buildSummary([]),
      reply_to_message_id: data.reply_to_message_id || replyToMessageId || null,
      message_type:
        data.message_type === "text" && messageType !== "text"
          ? messageType
          : data.message_type || messageType,
    };
  },

  /**
   * Tìm một tin nhắn theo ID (kèm thông tin attachments)
   * @param {string|number} messageId
   */
  findById: async (messageId) => {
    if (!messageId) return null;
    const { data, error } = await supabase
      .from("messages")
      .select(MESSAGE_FIELDS)
      .eq("message_id", String(messageId))
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.warn("[MessageModel.findById] Warning finding message:", error.message);
      return null;
    }
    if (!data) return null;

    let attachments = [];
    let reactions = [];
    try {
      const [atts, reacts] = await Promise.all([
        AttachmentModel.findByMessageIds([String(data.message_id)]),
        ReactionModel.findByMessageId(String(data.message_id)),
      ]);
      attachments = atts || [];
      reactions = reacts || [];
    } catch {}

    return formatMessageRow(data, attachments, null, reactions);
  },

  /**
   * Tìm danh sách tin nhắn theo danh sách IDs
   * @param {Array<string|number>} messageIds
   */
  findByIds: async (messageIds = []) => {
    const validIds = Array.from(new Set(messageIds.filter(Boolean).map(String)));
    if (!validIds.length) return [];

    const { data, error } = await supabase
      .from("messages")
      .select(MESSAGE_FIELDS)
      .in("message_id", validIds);

    if (error) {
      console.warn("[MessageModel.findByIds] Warning querying messages:", error.message);
      return [];
    }

    const rows = data || [];
    let attachments = [];
    let reactions = [];
    try {
      const [atts, reacts] = await Promise.all([
        AttachmentModel.findByMessageIds(validIds),
        ReactionModel.findByMessageIds(validIds),
      ]);
      attachments = atts;
      reactions = reacts;
    } catch {}

    const attachmentsByMsgId = {};
    attachments.forEach((att) => {
      const mid = String(att.message_id);
      if (!attachmentsByMsgId[mid]) attachmentsByMsgId[mid] = [];
      attachmentsByMsgId[mid].push(att);
    });

    const reactionsByMsgId = {};
    (reactions || []).forEach((r) => {
      if (r && r.message_id) {
        const mid = String(r.message_id);
        if (!reactionsByMsgId[mid]) reactionsByMsgId[mid] = [];
        reactionsByMsgId[mid].push(r);
      }
    });

    return rows.map((msg) => {
      const msgAtts = attachmentsByMsgId[String(msg.message_id)] || [];
      const msgReactions = reactionsByMsgId[String(msg.message_id)] || [];
      return formatMessageRow(msg, msgAtts, null, msgReactions);
    });
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

  /**
   * Lấy tin nhắn mới nhất trong cuộc trò chuyện
   */
  findLatestByConversation: async (conversationId) => {
    if (!conversationId) return null;
    const { data, error } = await supabase
      .from("messages")
      .select("message_id, conversation_id, sender_id, sender_type, message_type, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  },

  /**
   * Kiểm tra xem trong cuộc trò chuyện đã có tin nhắn với nội dung tương ứng chưa
   */
  existsWithContent: async (conversationId, content) => {
    if (!conversationId || typeof content !== "string" || !content.trim()) return false;
    const { data, error } = await supabase
      .from("messages")
      .select("message_id")
      .eq("conversation_id", conversationId)
      .eq("content", content.trim())
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    return Boolean(data);
  },
};

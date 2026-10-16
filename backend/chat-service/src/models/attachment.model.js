import crypto from "node:crypto";
import { supabase } from "../configs/supabase.js";

export const AttachmentModel = {
  /**
   * Tạo nhiều bản ghi đính kèm cùng lúc vào bảng message_attachments
   * Hỗ trợ lưu nhiều hình ảnh, video, tệp tin cho một tin nhắn
   *
   * @param {Array<Object>} attachments - Danh sách attachments: [{ attachmentId, messageId, fileUrl, fileName, fileType, fileSize }]
   * @returns {Promise<Array<Object>>}
   */
  createMany: async (attachments = []) => {
    if (!Array.isArray(attachments) || attachments.length === 0) return [];

    const now = new Date().toISOString();
    const payloads = attachments.map((att) => ({
      attachment_id: String(att.attachmentId || att.attachment_id || crypto.randomUUID()),
      message_id: String(att.messageId || att.message_id),
      file_url: String(att.fileUrl || att.file_url),
      file_name: String(att.fileName || att.file_name || "file"),
      file_type: String(att.fileType || att.file_type || "application/octet-stream"),
      file_size: att.fileSize != null ? Number(att.fileSize) : (att.file_size != null ? Number(att.file_size) : null),
      created_at: att.createdAt || att.created_at || now,
    }));

    try {
      // 1. Thử insert vào public.message_attachments
      let { data, error } = await supabase
        .from("message_attachments")
        .insert(payloads)
        .select();

      // 2. Dự phòng: nếu table nằm trong schema 'chat'
      if (error && error.message?.includes("relation") && error.message?.includes("does not exist")) {
        try {
          const chatSchemaRes = await supabase
            .schema("chat")
            .from("message_attachments")
            .insert(payloads)
            .select();
          if (!chatSchemaRes.error && chatSchemaRes.data) {
            data = chatSchemaRes.data;
            error = null;
          }
        } catch {}
      }

      if (error) {
        console.error("[AttachmentModel.createMany] Error:", error.message);
        throw error;
      }

      return data || payloads;
    } catch (err) {
      console.warn("[AttachmentModel.createMany] Warning:", err.message);
      // Trả về payloads để đảm bảo luồng tin nhắn không bị gãy nếu DB chưa migrate kịp
      return payloads;
    }
  },

  /**
   * Tạo 1 bản ghi đính kèm mới vào bảng message_attachments
   */
  create: async ({
    attachmentId,
    messageId,
    fileUrl,
    fileName,
    fileType,
    fileSize,
  }) => {
    const list = await AttachmentModel.createMany([
      {
        attachmentId,
        messageId,
        fileUrl,
        fileName,
        fileType,
        fileSize,
      },
    ]);
    return list && list.length > 0 ? list[0] : null;
  },

  /**
   * Lấy danh sách attachments theo danh sách message_id (dạng mảng)
   */
  findByMessageIds: async (messageIds = []) => {
    if (!messageIds || messageIds.length === 0) return [];

    try {
      const stringIds = messageIds.map((id) => String(id));
      let { data, error } = await supabase
        .from("message_attachments")
        .select(`
          attachment_id,
          message_id,
          file_url,
          file_name,
          file_type,
          file_size,
          created_at
        `)
        .in("message_id", stringIds)
        .order("created_at", { ascending: true });

      // Dự phòng nếu bảng nằm trong schema 'chat'
      if (error && error.message?.includes("relation") && error.message?.includes("does not exist")) {
        try {
          const chatSchemaRes = await supabase
            .schema("chat")
            .from("message_attachments")
            .select(`
              attachment_id,
              message_id,
              file_url,
              file_name,
              file_type,
              file_size,
              created_at
            `)
            .in("message_id", stringIds)
            .order("created_at", { ascending: true });
          if (!chatSchemaRes.error && chatSchemaRes.data) {
            data = chatSchemaRes.data;
            error = null;
          }
        } catch {}
      }

      if (error) {
        console.warn("[AttachmentModel.findByMessageIds] Warning:", error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.warn("[AttachmentModel.findByMessageIds] Exception:", err.message);
      return [];
    }
  },
};

import crypto from "node:crypto";
import { supabase } from "../configs/supabase.js";

export const AttachmentModel = {
  /**
   * Tạo bản ghi đính kèm mới vào bảng message_attachments
   */
  create: async ({
    attachmentId,
    messageId,
    fileUrl,
    fileName,
    fileType,
    fileSize,
  }) => {
    const id = attachmentId || crypto.randomUUID();
    const now = new Date().toISOString();

    const payload = {
      attachment_id: String(id),
      message_id: String(messageId),
      file_url: String(fileUrl),
      file_name: String(fileName || "file"),
      file_type: String(fileType || "application/octet-stream"),
      file_size: fileSize ? Number(fileSize) : null,
      created_at: now,
    };

    const { data, error } = await supabase
      .from("message_attachments")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("[AttachmentModel.create] Error:", error.message);
      throw error;
    }

    return data;
  },

  /**
   * Lấy danh sách attachments theo danh sách message_id (dạng mảng)
   */
  findByMessageIds: async (messageIds = []) => {
    if (!messageIds || messageIds.length === 0) return [];

    try {
      const stringIds = messageIds.map((id) => String(id));
      const { data, error } = await supabase
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

      if (error) {
        // Nếu bảng message_attachments chưa được tạo trong Supabase, ghi nhận cảnh báo
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

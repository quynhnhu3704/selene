import crypto from "node:crypto";
import { supabase } from "../configs/supabase.js";

export const ReactionModel = {
  /**
   * Tính toán thống kê biểu cảm (total và số lượng từng icon) từ danh sách reactions
   * @param {Array} reactions - Mảng các reaction của tin nhắn
   * @returns {Object} { total: number, [emoji]: number }
   */
  buildSummary: (reactions = []) => {
    if (!Array.isArray(reactions) || reactions.length === 0) {
      return {
        total: 0,
      };
    }

    const counts = {};
    reactions.forEach((r) => {
      const emoji = r.reaction;
      if (!emoji) return;
      counts[emoji] = (counts[emoji] || 0) + 1;
    });

    return {
      total: reactions.length,
      ...counts,
    };
  },

  /**
   * Tạo bản ghi biểu cảm mới
   */
  create: async ({ reactionId, messageId, accountId, reaction }) => {
    const id = reactionId || crypto.randomUUID();
    const now = new Date().toISOString();

    const payload = {
      reaction_id: String(id),
      message_id: String(messageId),
      account_id: String(accountId),
      reaction: String(reaction),
      created_at: now,
    };

    const { data, error } = await supabase
      .from("message_reactions")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("[ReactionModel.create] Error:", error.message);
      throw error;
    }

    return data;
  },

  /**
   * Cập nhật biểu cảm theo reaction_id
   */
  update: async (reactionId, { reaction }) => {
    const { data, error } = await supabase
      .from("message_reactions")
      .update({ reaction: String(reaction) })
      .eq("reaction_id", String(reactionId))
      .select()
      .single();

    if (error) {
      console.error("[ReactionModel.update] Error:", error.message);
      throw error;
    }

    return data;
  },

  /**
   * Xóa biểu cảm theo reaction_id
   */
  delete: async (reactionId) => {
    const { data, error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("reaction_id", String(reactionId))
      .select();

    if (error) {
      console.error("[ReactionModel.delete] Error:", error.message);
      throw error;
    }

    return data;
  },

  /**
   * Xóa biểu cảm của 1 tài khoản trên 1 tin nhắn
   */
  deleteByMessageAndAccount: async (messageId, accountId) => {
    const { data, error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", String(messageId))
      .eq("account_id", String(accountId))
      .select();

    if (error) {
      console.error("[ReactionModel.deleteByMessageAndAccount] Error:", error.message);
      throw error;
    }

    return data;
  },

  /**
   * Tìm biểu cảm của 1 tài khoản trên 1 tin nhắn cụ thể
   */
  findByMessageAndAccount: async (messageId, accountId) => {
    if (!messageId || !accountId) return null;

    try {
      const { data, error } = await supabase
        .from("message_reactions")
        .select(`
          reaction_id,
          message_id,
          account_id,
          reaction,
          created_at
        `)
        .eq("message_id", String(messageId))
        .eq("account_id", String(accountId))
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.warn("[ReactionModel.findByMessageAndAccount] Warning:", error.message);
        return null;
      }

      return data || null;
    } catch (err) {
      console.warn("[ReactionModel.findByMessageAndAccount] Exception:", err.message);
      return null;
    }
  },

  /**
   * Lấy danh sách tất cả các reaction của 1 tin nhắn
   * @param {string|number} messageId
   * @returns {Array}
   */
  findByMessageId: async (messageId) => {
    if (!messageId) return [];

    try {
      const { data, error } = await supabase
        .from("message_reactions")
        .select(`
          reaction_id,
          message_id,
          account_id,
          reaction,
          created_at
        `)
        .eq("message_id", String(messageId))
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[ReactionModel.findByMessageId] Warning:", error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.warn("[ReactionModel.findByMessageId] Exception:", err.message);
      return [];
    }
  },

  /**
   * Lấy danh sách reaction theo danh sách message_id
   */
  findByMessageIds: async (messageIds = []) => {
    if (!messageIds || messageIds.length === 0) return [];

    try {
      const stringIds = messageIds.map((id) => String(id));
      const { data, error } = await supabase
        .from("message_reactions")
        .select(`
          reaction_id,
          message_id,
          account_id,
          reaction,
          created_at
        `)
        .in("message_id", stringIds)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[ReactionModel.findByMessageIds] Warning:", error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.warn("[ReactionModel.findByMessageIds] Exception:", err.message);
      return [];
    }
  },
};

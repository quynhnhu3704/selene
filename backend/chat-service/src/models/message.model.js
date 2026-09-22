import { supabase } from "../configs/supabase.js";

export const MessageModel = {
  findByConversation: async (id, before, limit) => {
    let query = supabase.from("messages").select("*").eq("conversation_id", id);
    if (before) query = query.lt("message_id", before);
    const { data, error } = await query.order("message_id", { ascending: false }).limit(limit);
    if (error) throw error;
    return data.reverse();
  },

  create: async (id, senderId, content, clientId) => {
    const { data, error } = await supabase.rpc("send_support_message", {
      p_conversation_id: id, p_sender_id: senderId, p_content: content, p_client_id: clientId,
    });
    if (error) {
      if (error.code === "P0001") throw { status: 409, message: error.message };
      throw error;
    }
    return data;
  },

  markRead: async (id, customerId, isCustomer, throughId) => {
    let query = supabase.from("messages").update({ is_read: true })
      .eq("conversation_id", id).eq("is_read", false).lte("message_id", throughId);
    query = isCustomer ? query.neq("sender_id", customerId) : query.eq("sender_id", customerId);
    const { data, error } = await query.select("message_id");
    if (error) throw error;
    return data.map((message) => message.message_id);
  },
};

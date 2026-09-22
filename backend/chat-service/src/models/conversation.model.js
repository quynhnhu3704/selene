import { supabase } from "../configs/supabase.js";

export const ConversationModel = {
  findAccount: async (accountId) => {
    const { data, error } = await supabase.from("accounts")
      .select("account_id, role_id, status, roles(status, role_permissions(permissions(name, status)))")
      .eq("account_id", accountId).maybeSingle();
    if (error) throw error;
    return data;
  },

  findById: async (id) => {
    const { data, error } = await supabase.from("support_conversation_details")
      .select("*").eq("conversation_id", id).maybeSingle();
    if (error) throw error;
    return data;
  },

  findByCustomer: async (customerId) => {
    const { data, error } = await supabase.from("support_conversation_details")
      .select("*").eq("customer_id", customerId).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  create: async (customerId) => {
    const { data, error } = await supabase.from("conversations")
      .insert({ customer_id: customerId }).select().single();
    if (error) throw error;
    return data;
  },

  findAll: async (status, page, limit) => {
    let query = supabase.from("support_conversation_details").select("*", { count: "exact" });
    if (status) query = query.eq("status", status);
    const { data, error, count } = await query.order("updated_at", { ascending: false })
      .order("conversation_id").range((page - 1) * limit, page * limit - 1);
    if (error) throw error;
    return { conversations: data, totalItems: count };
  },

  countWaiting: async () => {
    const { count, error } = await supabase.from("conversations")
      .select("conversation_id", { count: "exact", head: true }).eq("status", "waiting");
    if (error) throw error;
    return count || 0;
  },

  assign: async (id, staffId) => {
    const { data, error } = await supabase.from("conversations")
      .update({ assigned_staff_id: staffId, status: "active", updated_at: new Date().toISOString() })
      .eq("conversation_id", id).eq("status", "waiting").is("assigned_staff_id", null)
      .select().maybeSingle();
    if (error) throw error;
    return data;
  },

  close: async (id, staffId, isAdmin) => {
    let query = supabase.from("conversations")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("conversation_id", id).neq("status", "closed");
    if (!isAdmin) query = query.eq("assigned_staff_id", staffId);
    const { data, error } = await query.select().maybeSingle();
    if (error) throw error;
    return data;
  },

  getCustomerInfo: async (customerId) => {
    const [profile, account] = await Promise.all([
      supabase.from("user_profiles").select("full_name, phone_number, avatar_url")
        .eq("account_id", customerId).maybeSingle(),
      supabase.from("accounts").select("email").eq("account_id", customerId).single(),
    ]);
    for (const result of [profile, account]) if (result.error) throw result.error;
    return { ...profile.data, ...account.data };
  },
};

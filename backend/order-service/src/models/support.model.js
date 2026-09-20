import { supabase } from "../configs/supabase.js";

export const SupportModel = {
  findRecentOrders: async (customerId) => {
    const { data, error } = await supabase.from("orders")
      .select("order_id, order_code, status, final_amount, created_at")
      .eq("account_id", customerId).order("created_at", { ascending: false }).limit(5);
    if (error) throw error;
    return data;
  },
};

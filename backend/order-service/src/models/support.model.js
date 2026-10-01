import { supabase } from "../configs/supabase.js";

export const SupportModel = {
  findRecentOrders: async (customerId) => {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const { data, error } = await supabase.from("orders")
      .select("order_id, order_code, status, final_amount, created_at")
      .eq("account_id", customerId)
      .gte("created_at", twoMonthsAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(3);
    if (error) throw error;
    return data || [];
  },
};

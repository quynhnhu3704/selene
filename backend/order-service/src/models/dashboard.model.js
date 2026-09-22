import { supabase } from "../configs/supabase.js";

export const DashboardModel = {
  findOrdersByDateRange: async (start, end) => {
    const orders = [];
    let from = 0;

    while (true) {
      const { data, error, count } = await supabase
        .from("orders")
        .select(
          "order_id, order_code, account_id, recipient_name, final_amount, payment_method, payment_status, status, created_at, order_items(product_id, product_name, quantity, unit_price, size)",
          { count: "exact" },
        )
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false })
        .order("order_id", { ascending: false })
        .range(from, from + 499);

      if (error) throw error;
      if (!data?.length) break;
      orders.push(...data);
      from += data.length;
      if (count !== null && from >= count) break;
    }

    return orders;
  },
};

import { supabase } from "../configs/supabase.js";

export const OrderModel = {
  // Tạo đơn hàng mới
  createOrder: async (orderData) => {
    const { data, error } = await supabase
      .from("orders")
      .insert([orderData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Tạo chi tiết đơn hàng (order items)
  createOrderItems: async (orderItemsData) => {
    const { data, error } = await supabase
      .from("order_items")
      .insert(orderItemsData)
      .select();

    if (error) throw error;
    return data;
  },

  // Tìm đơn hàng theo ID
  findById: async (orderId) => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  // Lấy danh sách đơn hàng theo accountId
  findByAccountId: async (accountId) => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },
};

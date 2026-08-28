// backend\order-service\src\models\order.model.js
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
      .select("*, order_items(*)")
      .eq("order_id", orderId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  // Tìm đơn hàng của đúng chủ sở hữu để phục vụ trang thanh toán.
  findByIdAndAccountId: async (orderId, accountId) => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("order_id", orderId)
      .eq("account_id", accountId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  // SePay gửi lại mã đơn trong nội dung/mã thanh toán.
  findByOrderCode: async (orderCode) => {
    const cleanCode = String(orderCode || "").replace(/-/g, "").trim();
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .or(`order_code.ilike.${orderCode},order_code.ilike.${cleanCode}`)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  // Đánh dấu thanh toán thành công cho đơn hàng: payment_status = "paid", status = "pending"
  markPaymentAsPaid: async (orderId) => {
    const { data, error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "pending",
      })
      .eq("order_id", orderId)
      .neq("payment_status", "paid")
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  markSePayPaymentAsPaid: async (orderId) => {
    return OrderModel.markPaymentAsPaid(orderId);
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

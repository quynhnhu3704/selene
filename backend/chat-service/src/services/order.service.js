import jwt from "jsonwebtoken";
import { config } from "../configs/index.js";
import { supabase } from "../configs/supabase.js";

// Lấy danh sách đơn hàng của khách hàng trong 2 tháng gần đây
export const getCustomerOrders = async (customerId) => {
  if (!customerId) return [];

  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const twoMonthsAgoIso = twoMonthsAgo.toISOString();

  // 1. Thử gọi API nội bộ từ order-service (Token nội bộ tồn tại 30 giây)
  try {
    const token = jwt.sign({ scope: "chat:orders", customerId }, config.jwtAccessSecret, {
      expiresIn: "30s",
      audience: "order-service",
      issuer: "chat-service",
    });

    const response = await fetch(`${config.orderServiceUrl.replace(/\/$/, "")}/internal/support/orders`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      const result = await response.json();
      const orders = Array.isArray(result.data) ? result.data : [];
      return orders.filter((o) => new Date(o.created_at) >= twoMonthsAgo).slice(0, 3);
    }
  } catch (error) {
    console.warn("Lỗi gọi internal order-service, chuyển sang fallback Supabase:", error.message);
  }

  // 2. Fallback trực tiếp qua Supabase (chia sẻ chung database) để tránh lỗi gián đoạn hỗ trợ
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("order_id, order_code, status, final_amount, created_at")
      .eq("account_id", customerId)
      .gte("created_at", twoMonthsAgoIso)
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Lỗi khi truy vấn đơn hàng fallback từ Supabase:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Lỗi ngoại lệ khi truy vấn đơn hàng:", err);
    return [];
  }
};


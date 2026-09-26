import jwt from "jsonwebtoken";
import { config } from "../configs/index.js";

// Token nội bộ chỉ đọc được đơn của khách đang mở hội thoại, tồn tại 30 giây.
export const getCustomerOrders = async (customerId) => {
  const token = jwt.sign(
    { scope: "chat:orders", customerId },
    config.jwtAccessSecret,
    {
      expiresIn: "30s",
      audience: "order-service",
      issuer: "chat-service",
    },
  );
  const response = await fetch(
    `${config.orderServiceUrl.replace(/\/$/, "")}/internal/support/orders`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!response.ok) throw new Error("Không thể tải đơn hàng từ order-service.");
  const result = await response.json();
  return result.data;
};

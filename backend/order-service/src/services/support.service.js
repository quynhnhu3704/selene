import jwt from "jsonwebtoken";
import { config } from "../configs/index.js";
import { SupportModel } from "../models/support.model.js";

export const getSupportOrders = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, config.jwtAccessSecret, {
      algorithms: ["HS256"], audience: "order-service", issuer: "chat-service",
    });
    if (payload.scope !== "chat:orders" || typeof payload.customerId !== "string" || !payload.customerId) {
      throw new Error("Invalid support scope");
    }
  } catch {
    throw { status: 403, message: "Không có quyền đọc ngữ cảnh đơn hàng!" };
  }
  return SupportModel.findRecentOrders(payload.customerId);
};

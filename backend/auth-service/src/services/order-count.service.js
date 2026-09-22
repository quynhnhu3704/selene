// backend/auth-service/src/services/order-count.service.js
import { config } from "../configs/index.js";

// Lấy thống kê đơn hàng từ order-service
export const getOrderCounts = async (authorization) => {
  try {
    const response = await fetch(
      `${config.orderServiceUrl.replace(/\/$/, "")}/manage/user-order-counts`,
      {
        headers: { Authorization: authorization || "" },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      throw new Error(`Lỗi order-service: ${response.status}`);
    }

    const { data } = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Dữ liệu thống kê đơn hàng không hợp lệ!");
    }

    return data;
  } catch {
    const error = new Error(
      "Không thể lấy số đơn hàng từ order-service. Vui lòng thử lại sau!",
    );
    error.status = 503;
    throw error;
  }
};

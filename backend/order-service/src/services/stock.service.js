import { requestProductDetails } from "../configs/rabbitmq.js";

async function updateStock(action, items) {
  const response = await requestProductDetails({ action, items }, "rpc_stock_queue");
  if (!response?.success) throw new Error(response?.message || "Không thể cập nhật tồn kho.");
}

export const reserveStock = items => updateStock("reserve", items);
export const restoreStock = items => updateStock("restore", items);

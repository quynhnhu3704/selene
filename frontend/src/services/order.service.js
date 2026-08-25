// frontend\src\services\order.service.js
import http from "./http";

export const placeOrder = async (data) => {
  const res = await http.post("/orders/place-order", data);
  return res.data;
};

export const getOrderById = async (orderId) => {
  const res = await http.get(`/orders/order/${encodeURIComponent(orderId)}`);
  return res.data;
};

export const getOrders = async () => {
  const res = await http.get("/orders/order-list");
  return res.data;
};

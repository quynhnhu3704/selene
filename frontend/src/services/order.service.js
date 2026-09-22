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

export const getAdminOrders = async (params) => {
  const res = await http.get("/orders/manage/orders", { params });
  return res.data;
};

export const getAdminOrderDetail = async (orderId) => {
  const res = await http.get(
    `/orders/manage/orders/${encodeURIComponent(orderId)}`,
  );
  return res.data;
};

export const updateAdminOrder = async (orderId, data) => {
  const res = await http.put(
    `/orders/manage/orders/${encodeURIComponent(orderId)}`,
    data,
    { timeout: 60000 },
  );
  return res.data;
};

export const createAdminOrder = async (data) => {
  const res = await http.post("/orders/manage/orders", data, {
    timeout: 60000,
  });
  return res.data;
};
export const exportAdminOrders = async (params) => {
  const res = await http.get("/orders/manage/orders/export", {
    params,
    responseType: "blob",
    timeout: 60000,
  });
  return res.data;
};

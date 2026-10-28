// frontend\src\services\cart.service.js
import http from "./http";

// lấy giỏ hàng
export const getCart = async ({ signal } = {}) => {
  const res = await http.get("/orders/cart", { signal });
  return res.data;
};

// thêm sản phẩm vào giỏ hàng
export const addToCart = async (data) => {
  const res = await http.post("/orders/cart/add", data);
  return res.data;
};

// xóa sản phẩm khỏi giỏ hàng
export const removeFromCart = async (cartItemId) => {
  const res = await http.delete(`/orders/cart/remove/${cartItemId}`);
  return res.data;
};

// cập nhật trực tiếp số lượng sản phẩm
export const updateCartItemQuantity = async (cartItemId, quantity) => {
  const res = await http.put(`/orders/cart/update-quantity/${cartItemId}`, {
    quantity,
  });
  return res.data;
};


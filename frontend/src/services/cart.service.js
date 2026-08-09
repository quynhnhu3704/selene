// frontend\src\services\cart.service.js
import http from "./http";

// lấy giỏ hàng
export const getCart = async () => {
    const res = await http.get("/orders/cart");
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

// giảm số lượng sản phẩm
export const decreaseQuantity = async (cartItemId) => {
    const res = await http.put(`/orders/cart/decrease/${cartItemId}`);
    return res.data;
};

// tăng số lượng sản phẩm
export const increaseQuantity = async (cartItemId) => {
    const res = await http.put(`/orders/cart/increase/${cartItemId}`);
    return res.data;
};
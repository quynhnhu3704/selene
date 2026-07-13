// frontend/src/services/product.service.js
import http from "./http";

export const getProducts = async (page = 1, limit = 12) => {
  const res = await http.get("/products/product-list", {
    params: {
      page,
      limit,
    },
    withCredentials: false,
  });

  return res.data;
};

export const getProductById = async (id) => {
  const res = await http.get(`/products/product-detail/${id}`, {
    withCredentials: false,
  });

  return res.data;
};
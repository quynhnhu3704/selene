// frontend/src/services/category.service.js
import http from "./http";

export const getAdminCategoryDetail = async (categoryId) => {
  const res = await http.get(`/products/manage/category-detail/${categoryId}`);
  return res.data;
};

export const getAdminCategories = async (params = {}) => {
  const res = await http.get("/products/manage/categories", { params });
  return res.data;
};

export const createAdminCategory = async (formData) => {
  const res = await http.post("/products/manage/category/add", formData);
  return res.data;
};

export const updateAdminCategory = async (categoryId, formData) => {
  const res = await http.put(
    `/products/manage/category/update/${categoryId}`,
    formData,
  );
  return res.data;
};

export const updateAdminCategoryStatus = async (categoryId) => {
  const res = await http.put(
    `/products/manage/category/change-status/${categoryId}`,
  );
  return res.data;
};

export const exportCategoriesToExcel = async () => {
  const res = await http.get("/products/manage/categories/export", {
    responseType: "blob",
  });
  return res.data;
};

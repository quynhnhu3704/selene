// frontend/src/services/promotion.service.js
import http from "./http";

/**
 * Lấy danh sách chương trình khuyến mãi cho Admin
 * GET: http://localhost:8000/api/products/manage/promotions
 * @param {Object} params - { page, limit, status, q }
 */
export const getAdminPromotions = async (params = {}) => {
  const res = await http.get("/products/manage/promotions", { params });
  return res.data;
};

/**
 * Lấy chi tiết chương trình khuyến mãi theo ID
 * GET: http://localhost:8000/api/products/manage/promotion-detail/:promotionId
 * @param {string} promotionId
 */
export const getAdminPromotionDetail = async (promotionId) => {
  const res = await http.get(
    `/products/manage/promotion-detail/${encodeURIComponent(promotionId)}`,
  );
  return res.data;
};

/**
 * Tạo mới chương trình khuyến mãi
 * POST: http://localhost:8000/api/products/manage/promotion/add
 * @param {Object} data - { name, description, discount_type, discount_value, quantity_limit, start_date, end_date, status, product_ids }
 */
export const createAdminPromotion = async (data) => {
  const res = await http.post("/products/manage/promotion/add", data);
  return res.data;
};

/**
 * Cập nhật thông tin chương trình khuyến mãi
 * PUT: http://localhost:8000/api/products/manage/promotion/update/:promotionId
 * @param {string} promotionId
 * @param {Object} data
 */
export const updateAdminPromotion = async (promotionId, data) => {
  const res = await http.put(
    `/products/manage/promotion/update/${encodeURIComponent(promotionId)}`,
    data,
  );
  return res.data;
};

/**
 * Cập nhật trạng thái chương trình khuyến mãi (hoặc tự động toggle active/inactive nếu không truyền status)
 * PUT: http://localhost:8000/api/products/manage/promotion/change-status/:promotionId
 * @param {string} promotionId
 * @param {string} [status] - "active" | "inactive" | "out_of_stock" | "expired"
 */
export const updateAdminPromotionStatus = async (promotionId, status) => {
  const body = status ? { status } : {};
  const res = await http.put(
    `/products/manage/promotion/change-status/${encodeURIComponent(promotionId)}`,
    body,
  );
  return res.data;
};

/**
 * Thêm danh sách sản phẩm vào chương trình khuyến mãi
 * POST: http://localhost:8000/api/products/manage/promotion/add-items/:promotionId
 * @param {string} promotionId
 * @param {string[]} productIds
 */
export const addProductsToPromotion = async (promotionId, productIds) => {
  const res = await http.post(
    `/products/manage/promotion/add-items/${encodeURIComponent(promotionId)}`,
    { product_ids: productIds },
  );
  return res.data;
};

/**
 * Cập nhật trạng thái của một sản phẩm khuyến mãi
 * PUT: http://localhost:8000/api/products/manage/promotion-item/change-status/:promotionItemId
 * @param {string} promotionItemId
 * @param {string} [status] - "active" | "inactive"
 */
export const updatePromotionItemStatus = async (promotionItemId, status) => {
  const body = status ? { status } : {};
  const res = await http.put(
    `/products/manage/promotion-item/change-status/${encodeURIComponent(promotionItemId)}`,
    body,
  );
  return res.data;
};


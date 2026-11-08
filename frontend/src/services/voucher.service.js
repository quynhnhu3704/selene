// frontend\src\services\voucher.service.js
import http from "./http";

export const getCustomerVouchers = async () => {
  const res = await http.get("/orders/vouchers");
  return res.data;
};

export const getVoucherByCode = async (code) => {
  const res = await http.get(
    `/orders/vouchers/code/${encodeURIComponent(code)}`,
  );
  return res.data;
};

// ================= ADMIN VOUCHERS =================
// GET: http://localhost:8000/api/orders/manage/vouchers
export const getAdminVouchers = async (params = {}) => {
  try {
    const res = await http.get("/orders/manage/vouchers", { params });
    return res.data;
  } catch (err) {
    // Dự phòng trường hợp backend map GET tại /manage/vouchers/add
    if (err.response?.status === 404) {
      const fallback = await http.get("/orders/manage/vouchers/add", { params });
      return fallback.data;
    }
    throw err;
  }
};

// GET: http://localhost:8000/api/orders/manage/vouchers/:voucherId
export const getAdminVoucherById = async (voucherId) => {
  const res = await http.get(
    `/orders/manage/vouchers/${encodeURIComponent(voucherId)}`,
  );
  return res.data;
};

// POST: http://localhost:8000/api/orders/manage/vouchers/add
export const createAdminVoucher = async (data) => {
  const res = await http.post("/orders/manage/vouchers/add", data);
  return res.data;
};

// PUT: http://localhost:8000/api/orders/manage/vouchers/update/:voucherId
export const updateAdminVoucher = async (voucherId, data) => {
  const res = await http.put(
    `/orders/manage/vouchers/update/${encodeURIComponent(voucherId)}`,
    data,
  );
  return res.data;
};

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

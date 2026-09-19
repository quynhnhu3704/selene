export const ORDER_STATUSES = [
  { key: "unpaid", label: "Chưa thanh toán", color: "warning" },
  { key: "pending", label: "Chờ xác nhận", color: "secondary" },
  { key: "confirmed", label: "Đã xác nhận", color: "primary" },
  { key: "processing", label: "Đang xử lý", color: "info" },
  { key: "shipping", label: "Đang giao", color: "warning" },
  { key: "delivered", label: "Đã giao", color: "success" },
  { key: "completed", label: "Hoàn thành", color: "success" },
  { key: "cancelled", label: "Đã hủy", color: "danger" },
];

export const SORT_OPTIONS = [
  { key: "default", label: "Mặc định" },
  { key: "quantity_desc", label: "Số lượng SP: Nhiều → Ít" },
  { key: "quantity_asc", label: "Số lượng SP: Ít → Nhiều" },
  { key: "total_desc", label: "Tổng tiền: Cao → Thấp" },
  { key: "total_asc", label: "Tổng tiền: Thấp → Cao" },
  { key: "az", label: "Khách hàng: A → Z" },
  { key: "za", label: "Khách hàng: Z → A" },
];

export const PAYMENT_METHODS = [
  { key: "cod", label: "Thanh toán khi nhận hàng" },
  { key: "bank", label: "Chuyển khoản ngân hàng" },
  { key: "sepay", label: "SePay QR" },
];

export const PAYMENT_STATUSES = [
  { key: "unpaid", label: "Chưa thanh toán" },
  { key: "paid", label: "Đã thanh toán" },
  { key: "refunded", label: "Đã hoàn tiền" },
];

export const getOrderStatus = (status) =>
  ORDER_STATUSES.find(
    (item) => item.key === (status === "cancel" ? "cancelled" : status),
  ) || { label: status || "—", color: "secondary" };

export const fmtVND = (value) =>
  Number(value || 0).toLocaleString("vi-VN") + "đ";

export const formatDate = (value) => {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("vi-VN");
};

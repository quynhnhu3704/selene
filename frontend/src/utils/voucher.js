// frontend\src\utils\voucher.js
export const getVoucherDiscount = (voucher, orderValue) => {
  if (!voucher || orderValue < Number(voucher.min_order_value || 0)) return 0;

  let discount = 0;
  if (voucher.discount_type === "percentage") {
    discount = (orderValue * Number(voucher.discount_value)) / 100;
    if (Number(voucher.max_discount_amount) > 0) {
      discount = Math.min(discount, Number(voucher.max_discount_amount));
    }
  } else if (voucher.discount_type === "fixed_amount") {
    discount = Number(voucher.discount_value);
  }

  // API đặt hàng hiện miễn phí vận chuyển cho tất cả đơn hàng.
  return Math.max(0, Math.min(discount, orderValue));
};

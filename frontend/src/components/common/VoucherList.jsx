// frontend\src\components\common\VoucherList.jsx
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";

export default function VoucherList({
  vouchers,
  selectedCode,
  onSelect,
  disabled = false,
}) {
  return (
    <div className="d-flex flex-column gap-3">
      {vouchers.map((voucher) => (
        <div key={voucher.voucher_id} className="border rounded-3 p-3">
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              <div className="fw-bold mb-1">{voucher.name}</div>
              <div className="fw-semibold" style={{ color: "#871B1B" }}>
                {voucher.discount_type === "percentage"
                  ? `Giảm ${voucher.discount_value}%`
                  : voucher.discount_type === "free_shipping"
                    ? "Ưu đãi vận chuyển"
                    : `Giảm ${fmt(voucher.discount_value)}`}
              </div>
            </div>
            <i className="bi bi-ticket-perforated fs-4 text-secondary" />
          </div>
          <div className="small text-muted mt-2">
            Đơn tối thiểu {fmt(voucher.min_order_value)}
            {voucher.discount_type === "percentage" &&
              Number(voucher.max_discount_amount) > 0 && (
                <> · Giảm tối đa {fmt(voucher.max_discount_amount)}</>
              )}
          </div>
          <div className="d-flex justify-content-between align-items-center gap-2 mt-3">
            <span
              className="fw-bold small"
              style={{ overflowWrap: "anywhere" }}
            >
              {voucher.code}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-dark rounded-pill px-3 flex-shrink-0"
              disabled={disabled || selectedCode === voucher.code}
              onClick={() => onSelect(voucher)}
            >
              {selectedCode === voucher.code
                ? "Đã chọn"
                : selectedCode === undefined
                  ? "Sao chép mã"
                  : "Sử dụng"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

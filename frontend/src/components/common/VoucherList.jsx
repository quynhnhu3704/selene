// frontend\src\components\common\VoucherList.jsx
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";
const formatDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("vi-VN");
};

export default function VoucherList({
  vouchers,
  selectedCode,
  onSelect,
  disabled = false,
}) {
  return (
    <div className="d-flex flex-column gap-3">
      {vouchers.map((voucher) => {
        const vKey = voucher.voucher_id || voucher.id || voucher.code;
        const expiry = formatDate(voucher.end_date);

        return (
          <div key={vKey} className="border rounded-3 p-3 bg-white shadow-sm">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                <div className="fw-bold mb-1 text-dark">{voucher.name}</div>
                <div className="fw-semibold" style={{ color: "#871B1B", fontSize: 16 }}>
                  {voucher.discount_type === "percentage"
                    ? `Giảm ${voucher.discount_value}%`
                    : voucher.discount_type === "free_shipping"
                      ? "Ưu đãi vận chuyển"
                      : `Giảm ${fmt(voucher.discount_value)}`}
                </div>
              </div>
              <i className="bi bi-ticket-perforated fs-3 text-danger opacity-75" />
            </div>

            <div className="small text-muted mt-2">
              Đơn tối thiểu {fmt(voucher.min_order_value ?? voucher.min_order)}
              {voucher.discount_type === "percentage" &&
                Number(voucher.max_discount_amount) > 0 && (
                  <> · Giảm tối đa {fmt(voucher.max_discount_amount)}</>
                )}
              {expiry && <> · HSD: {expiry}</>}
            </div>

            <div className="d-flex justify-content-between align-items-center gap-2 mt-3 pt-2 border-top">
              <span
                className="fw-bold font-monospace text-uppercase px-2 py-1 bg-light rounded text-dark"
                style={{ overflowWrap: "anywhere", fontSize: 13, letterSpacing: "0.5px" }}
              >
                {voucher.code}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-dark rounded-pill px-3 flex-shrink-0 fw-semibold"
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
        );
      })}
    </div>
  );
}

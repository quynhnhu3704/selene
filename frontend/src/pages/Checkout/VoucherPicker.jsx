// frontend\src\pages\Checkout\VoucherPicker.jsx
import Loading from "../../components/common/Loading";
import { useEffect, useRef, useState } from "react";
import VoucherList from "../../components/common/VoucherList";
import {
  getCustomerVouchers,
  getVoucherByCode,
} from "../../services/voucher.service";
import { getVoucherDiscount } from "../../utils/voucher";

export default function VoucherPicker({
  orderValue,
  voucher,
  onChange,
  onCheckingChange,
  disabled,
}) {
  const [vouchers, setVouchers] = useState([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    requestId.current += 1;
    onChange(null);
    getCustomerVouchers()
      .then((response) => {
        if (!active) return;
        setVouchers(
          (response.data || [])
            .filter((item) => Number(item.min_order_value || 0) <= orderValue)
            .sort(
              (a, b) =>
                getVoucherDiscount(b, orderValue) -
                getVoucherDiscount(a, orderValue),
            ),
        );
      })
      .catch((requestError) => {
        if (!active) return;
        setVouchers([]);
        setError(
          requestError.response?.data?.message ||
            "Không thể tải mã khuyến mãi. Vui lòng thử lại.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      requestId.current += 1;
      onCheckingChange(false);
    };
  }, [orderValue, retry, onChange, onCheckingChange]);

  const applyCode = async () => {
    const value = code.trim();
    if (!value || checking || loading || disabled) return;
    const currentRequest = ++requestId.current;
    setChecking(true);
    onCheckingChange(true);
    setError("");
    try {
      const response = await getVoucherByCode(value);
      const available = await getCustomerVouchers();
      if (currentRequest !== requestId.current) return;
      const found = response.data;
      if (!found?.discount_type) {
        setError(response.message || "Mã khuyến mãi không còn sử dụng được.");
        return;
      }
      if (orderValue < Number(found.min_order_value || 0)) {
        setError(
          `Đơn hàng phải từ ${Number(found.min_order_value).toLocaleString("vi-VN")}đ để sử dụng mã này.`,
        );
        return;
      }
      if (
        !(available.data || []).some(
          (item) => item.voucher_id === found.voucher_id,
        )
      ) {
        setError(
          "Mã khuyến mãi không còn hiệu lực hoặc bạn đã hết lượt sử dụng.",
        );
        return;
      }
      onChange(found);
      setCode(found.code);
    } catch (requestError) {
      if (currentRequest === requestId.current)
        setError(
          requestError.response?.data?.message ||
            "Không thể kiểm tra mã khuyến mãi. Vui lòng thử lại.",
        );
    } finally {
      if (currentRequest === requestId.current) {
        setChecking(false);
        onCheckingChange(false);
      }
    }
  };

  return (
    <div className="checkout-card">
      <div className="checkout-card-title">Mã khuyến mãi</div>
      <label htmlFor="voucher-code" className="checkout-label">
        Nhập mã giảm giá
      </label>
      <div className="d-flex gap-2 mb-3">
        <input
          id="voucher-code"
          className="checkout-input mb-0"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              applyCode();
            }
          }}
          placeholder="Nhập mã khuyến mãi"
          disabled={disabled || checking || loading}
        />
        <button
          type="button"
          className="btn btn-dark text-nowrap"
          disabled={disabled || checking || loading || !code.trim()}
          onClick={applyCode}
        >
          {checking ? "Đang kiểm tra..." : "Áp dụng"}
        </button>
      </div>
      {error && (
        <div className="small text-danger mb-3" role="alert">
          {error}
          <button
            type="button"
            className="btn btn-link btn-sm text-dark"
            disabled={disabled || checking || loading}
            onClick={() => {
              setLoading(true);
              setError("");
              setRetry((value) => value + 1);
            }}
          >
            Tải lại
          </button>
        </div>
      )}
      {voucher && (
        <div className="d-flex justify-content-between align-items-center gap-2 bg-light rounded-3 p-3 mb-3">
          <span className="small">
            Đã chọn: <strong>{voucher.code}</strong>
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            disabled={disabled || checking}
            onClick={() => onChange(null)}
          >
            Bỏ chọn
          </button>
        </div>
      )}
      {loading ? (
        <Loading text="Đang tải mã khuyến mãi..." />
      ) : (
        <>
          <p className="small text-muted">
            {vouchers.length
              ? "Chọn một mã phù hợp với các sản phẩm thanh toán."
              : "Chưa có mã khuyến mãi phù hợp với đơn hàng này."}
          </p>
          <VoucherList
            vouchers={vouchers}
            selectedCode={voucher?.code || ""}
            disabled={disabled || checking}
            onSelect={(item) => {
              onChange(item);
              setCode(item.code);
              setError("");
            }}
          />
        </>
      )}
      <p className="small text-muted mt-3 mb-0">
        Mỗi đơn dùng một mã. Phí vận chuyển hiện được miễn phí; mã vận chuyển
        không giảm thêm tiền sản phẩm.
      </p>
    </div>
  );
}

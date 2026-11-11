import EmptyState from "../../components/common/EmptyState";
// frontend\src\pages\Checkout\index.jsx
import { useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";
import { CartContext } from "../../context/CartContext";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { placeOrder } from "../../services/order.service";
import { getUser } from "../../utils/auth";
import { getProfile } from "../../services/user.service";
import Address from "../../components/common/Address";
import VoucherPicker from "./VoucherPicker";
import { getVoucherDiscount } from "../../utils/voucher";

const fmt = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";

export default function Checkout() {
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [submitting, setSubmitting] = useState(false);
  const [voucher, setVoucher] = useState(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [addressArea, setAddressArea] = useState(null);
  const [addressDetail, setAddressDetail] = useState("");
  const editedFields = useRef(new Set());
  const location = useLocation();
  const navigate = useNavigate();

  const { cart, fetchCart } = useContext(CartContext);
  const currentUser = getUser();
  const [shippingInfo, setShippingInfo] = useState({
    recipient_name: currentUser?.full_name || "",
    recipient_phone: currentUser?.phone_number || "",
    recipient_address: "",
    note: "",
  });

  const selected = location.state?.selected || [];
  useEffect(() => {
    let active = true;
    getProfile()
      .then((response) => {
        if (!active) return;
        const profile = response.data.profile;
        setShippingInfo((current) => ({
          ...current,
          recipient_name: editedFields.current.has("recipient_name")
            ? current.recipient_name
            : profile?.full_name || current.recipient_name,
          recipient_phone: editedFields.current.has("recipient_phone")
            ? current.recipient_phone
            : profile?.phone_number || current.recipient_phone,
        }));
      })
      .catch(() => {
        if (active)
          toast.error(
            "Không thể tải hồ sơ. Bạn có thể nhập thông tin nhận hàng.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const cartItems = cart?.items || [];

  const updateShippingInfo = (field, value) => {
    editedFields.current.add(field);
    setShippingInfo((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: "" }));
  };

  const validateShippingInfo = () => {
    const errors = {};
    const phoneDigits = shippingInfo.recipient_phone.replace(/\D/g, "");

    if (!shippingInfo.recipient_name.trim()) {
      errors.recipient_name = "Vui lòng nhập họ và tên.";
    }

    if (!shippingInfo.recipient_phone.trim()) {
      errors.recipient_phone = "Vui lòng nhập số điện thoại.";
    } else if (phoneDigits.length < 9 || phoneDigits.length > 11) {
      errors.recipient_phone = "Số điện thoại chưa hợp lệ.";
    }

    if (!addressDetail.trim()) {
      errors.recipient_address = "Vui lòng nhập địa chỉ nhận hàng.";
    }
    if (!addressArea)
      errors.recipient_address =
        "Vui lòng chọn tỉnh / thành phố và phường / xã, rồi nhập số nhà, tên đường.";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isOutOfStock = (item) =>
    !item.product ||
    Boolean(item.product.error) ||
    (item.product.status && item.product.status !== "active") ||
    (item.product.product_status && item.product.product_status !== "active") ||
    Number(item.product.stock_quantity ?? 0) <= 0;

  // Chỉ lấy những sản phẩm được chọn từ Cart
  const selectedItems = cartItems.filter(
    (item) => item.product && selected.includes(item.cart_item_id),
  );

  const handlePlaceOrder = async () => {
    if (submitting || checkingVoucher || !validateShippingInfo()) {
      return;
    }

    const outOfStockItems = selectedItems.filter(isOutOfStock);
    if (outOfStockItems.length > 0) {
      toast.error(
        "Một số sản phẩm trong đơn hàng đã hết hàng. Vui lòng quay lại giỏ hàng kiểm tra.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        cart_item_ids: selected,
        payment_method: paymentMethod,
        recipient_name: shippingInfo.recipient_name.trim(),
        recipient_phone: shippingInfo.recipient_phone.trim(),
        recipient_address: shippingInfo.recipient_address,
        note: shippingInfo.note.trim(),
        ...(appliedVoucher ? { voucher_code: appliedVoucher.code } : {}),
      };

      const response = await placeOrder(payload);
      const order = response.data;

      await fetchCart();

      if (paymentMethod === "cod") {
        toast.success(response.message || "Đặt hàng thành công!");
        navigate("/tai-khoan/don-hang", { replace: true });
        return;
      }

      const payment = {
        orderId: order.order_id,
        orderCode: order.order_code,
        amount: order.final_amount,
        paymentMethod,
        transferNote: order.payment?.transfer_note || order.order_code,
        qrUrl: order.payment?.qr_url,
        bank: order.payment?.bank,
      };

      try {
        sessionStorage.setItem(
          `selene:payment:${order.order_id}`,
          JSON.stringify(payment),
        );
      } catch {
        // Chuyển trang vẫn hoạt động qua router state nếu sessionStorage không khả dụng.
      }

      navigate(`/thanh-toan/qr?orderId=${encodeURIComponent(order.order_id)}`, {
        state: payment,
        replace: true,
      });
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
          "Không thể đặt hàng. Vui lòng thử lại sau.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalQty = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = selectedItems.reduce(
    (sum, item) =>
      sum +
      (item.product.discount_price ?? item.product.original_price ?? 0) *
        item.quantity,
    0,
  );

  const appliedVoucher =
    voucher && totalPrice >= Number(voucher.min_order_value || 0)
      ? voucher
      : null;
  const discountAmount = getVoucherDiscount(appliedVoucher, totalPrice);

  // Nếu vào trang thanh toán trực tiếp mà không có sản phẩm
  if (selectedItems.length === 0) {
    return (
      <>
        <Helmet>
          <title>Thanh toán | Selene</title>
        </Helmet>

        <Breadcrumb
          items={[
            { label: "Trang chủ", path: "/" },
            { label: "Giỏ hàng", path: "/gio-hang" },
            { label: "Thanh toán" },
          ]}
        />

        <div
          style={{
            padding: "80px 24px",
            textAlign: "center",
            background: "#fff",
          }}
        >
          <EmptyState text="Không có sản phẩm nào để hiển thị" />

          <Link
            to="/gio-hang"
            className="btn btn-dark fw-semibold px-5 form-btn"
          >
            Quay lại giỏ hàng
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Thanh toán | Selene</title>
      </Helmet>


      <Breadcrumb
        items={[
          { label: "Trang chủ", path: "/" },
          { label: "Giỏ hàng", path: "/gio-hang" },
          { label: "Thanh toán" },
        ]}
      />

      <div className="checkout-page">
        <h1 className="checkout-title">Thanh toán</h1>

        <div className="row g-5 align-items-start">
          {/* ================= LEFT ================= */}
          <div className="col-12 col-lg-7">
            {/* Thông tin giao hàng */}
            <div className="checkout-card">
              <div className="checkout-card-title">Thông tin giao hàng</div>

              <div className="row">
                <div className="col-md-6">
                  <label className="checkout-label">Họ và tên</label>

                  <input
                    type="text"
                    className={`checkout-input ${
                      formErrors.recipient_name ? "input-error" : ""
                    }`}
                    placeholder="Nhập họ và tên"
                    value={shippingInfo.recipient_name}
                    onChange={(event) =>
                      updateShippingInfo("recipient_name", event.target.value)
                    }
                    aria-invalid={Boolean(formErrors.recipient_name)}
                  />

                  {formErrors.recipient_name && (
                    <span className="checkout-field-error">
                      {formErrors.recipient_name}
                    </span>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="checkout-label">Số điện thoại</label>

                  <input
                    type="tel"
                    className={`checkout-input ${
                      formErrors.recipient_phone ? "input-error" : ""
                    }`}
                    placeholder="Nhập số điện thoại"
                    value={shippingInfo.recipient_phone}
                    onChange={(event) =>
                      updateShippingInfo("recipient_phone", event.target.value)
                    }
                    aria-invalid={Boolean(formErrors.recipient_phone)}
                  />

                  {formErrors.recipient_phone && (
                    <span className="checkout-field-error">
                      {formErrors.recipient_phone}
                    </span>
                  )}
                </div>
              </div>

              <label className="checkout-label">Địa chỉ nhận hàng</label>

              <Address
                onChange={(address, area, detail) => {
                  setAddressArea(area);
                  setAddressDetail(detail);
                  updateShippingInfo("recipient_address", address);
                }}
                inputClassName={`checkout-input ${
                  formErrors.recipient_address ? "input-error" : ""
                }`}
                invalid={Boolean(formErrors.recipient_address)}
              />

              {formErrors.recipient_address && (
                <span className="checkout-field-error">
                  {formErrors.recipient_address}
                </span>
              )}

              <label className="checkout-label">Ghi chú</label>

              <textarea
                className="checkout-textarea"
                placeholder="Ghi chú cho đơn hàng (nếu có)"
                value={shippingInfo.note}
                onChange={(event) =>
                  updateShippingInfo("note", event.target.value)
                }
              />
            </div>

            {/* Mã khuyến mãi */}
            <VoucherPicker
              key={totalPrice}
              orderValue={totalPrice}
              voucher={appliedVoucher}
              onChange={setVoucher}
              onCheckingChange={setCheckingVoucher}
              disabled={submitting}
            />

            {/* Phương thức thanh toán */}
            <div className="checkout-card">
              <div className="checkout-card-title">Phương thức thanh toán</div>

              {/* COD */}
              <label className="checkout-payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />

                <i className="bi bi-cash-coin" />

                <span className="checkout-payment-text">
                  Thanh toán khi nhận hàng
                </span>
              </label>

              {/* CHUYỂN KHOẢN */}
              <label className="checkout-payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="bank"
                  checked={paymentMethod === "bank"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />

                <i className="bi bi-bank" />

                <span className="checkout-payment-text">
                  Chuyển khoản ngân hàng
                </span>
              </label>

              {paymentMethod === "bank" && (
                <div className="checkout-payment-hint">
                  Sau khi tạo đơn, hệ thống sẽ hiển thị tên chủ tài khoản, số
                  tài khoản và ngân hàng để bạn chuyển khoản.
                </div>
              )}

              {/* SEPAY QR */}
              <label className="checkout-payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="sepay"
                  checked={paymentMethod === "sepay"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />

                <i className="bi bi-qr-code" />

                <span className="checkout-payment-text">
                  Thanh toán QR qua SePay
                </span>
              </label>

              {paymentMethod === "sepay" && (
                <div className="checkout-payment-hint">
                  Mã QR mang đúng số tiền và mã đơn; giao dịch sẽ được xác nhận
                  tự động khi SePay gửi webhook hợp lệ.
                </div>
              )}
            </div>
          </div>

          {/* ================= RIGHT ================= */}
          <div className="col-12 col-lg-5">
            <div className="checkout-summary">
              <div className="checkout-card-title">Đơn hàng của bạn</div>

              {selectedItems.map((item) => {
                const price =
                  item.product.discount_price ??
                  item.product.original_price ??
                  0;

                return (
                  <div className="checkout-item" key={item.cart_item_id}>
                    <img
                      src={item.product.image_url || "/placeholder.jpg"}
                      alt=""
                      className="checkout-item-img"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.jpg";
                      }}
                    />

                    <div className="checkout-item-info">
                      <div className="checkout-item-name">
                        {item.product.product_name}
                      </div>

                      <div className="checkout-item-meta">
                        SL: {item.quantity}
                      </div>

                      {item.product.color && (
                        <div className="checkout-item-meta">
                          Màu: {item.product.color}
                        </div>
                      )}

                      {item.product.size && (
                        <div className="checkout-item-meta">
                          Size: {item.product.size}
                        </div>
                      )}
                    </div>

                    <div className="checkout-item-price">
                      {fmt(price * item.quantity)}
                    </div>
                  </div>
                );
              })}

              <hr className="checkout-divider" />

              <div className="checkout-summary-row">
                <span>Tạm tính ({totalQty} sản phẩm)</span>

                <strong>{fmt(totalPrice)}</strong>
              </div>

              <div className="checkout-summary-row">
                <span>Phí vận chuyển</span>

                <strong style={{ color: "#28a745" }}>Miễn phí</strong>
              </div>

              {appliedVoucher && (
                <div className="checkout-summary-row">
                  <span>Khuyến mãi ({appliedVoucher.code})</span>
                  <strong style={{ color: "#28a745" }}>
                    -{fmt(discountAmount)}
                  </strong>
                </div>
              )}

              <hr className="checkout-divider" />

              <div className="checkout-total">
                <span className="checkout-total-label">Tổng cộng</span>

                <span className="checkout-total-value">
                  {fmt(totalPrice - discountAmount)}
                </span>
              </div>

              <button
                className="checkout-btn"
                type="button"
                onClick={handlePlaceOrder}
                disabled={submitting || checkingVoucher}
              >
                {submitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      aria-hidden="true"
                    />
                    Đang tạo đơn...
                  </>
                ) : (
                  "Đặt hàng"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

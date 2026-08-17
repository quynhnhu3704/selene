// frontend\src\pages\Checkout\index.jsx
import { useContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CartContext } from "../../context/CartContext";
import Breadcrumb from "../../components/layout/Breadcrumb";

const fmt = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";

export default function Checkout() {
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { cart } = useContext(CartContext);

  const selected = location.state?.selected || [];
  const cartItems = cart?.items || [];

  const handlePlaceOrder = async () => {
    try {
      setSubmitting(true);

      const payload = {
        cart_item_ids: selected,
        payment_method: paymentMethod,
        shipping_name: "",
        shipping_phone: "",
        shipping_address: "",
        note: "",
      };

      console.log("Creating order:", payload);

      // TODO: gọi order service
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Chỉ lấy những sản phẩm được chọn từ Cart
  const selectedItems = cartItems.filter(
    (item) => item.product && selected.includes(item.cart_item_id),
  );

  const totalQty = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = selectedItems.reduce(
    (sum, item) =>
      sum +
      (item.product.discount_price ?? item.product.original_price ?? 0) *
        item.quantity,
    0,
  );

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
          <i
            className="bi bi-cart-x"
            style={{
              fontSize: 64,
              color: "#e0e0e0",
              display: "block",
              marginBottom: 20,
            }}
          />

          <h4
            style={{
              fontWeight: 800,
              color: "#212529",
              marginBottom: 8,
            }}
          >
            Không có sản phẩm để thanh toán
          </h4>

          <p
            style={{
              color: "#6c757d",
              fontSize: 15,
              marginBottom: 28,
            }}
          >
            Vui lòng quay lại giỏ hàng và chọn sản phẩm.
          </p>

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

      <style>{`
        .checkout-page {
          padding: 32px 75px 72px;
          background: #fff;
          min-height: 70vh;
        }

        .checkout-title {
          font-size: 20px;
          font-weight: 800;
          color: #212529;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 28px;
        }

        .checkout-card {
          background: #fff;
          border: 1.5px solid #f0f0f0;
          border-radius: 16px;
          padding: 28px 24px;
          margin-bottom: 20px;
        }

        .checkout-card-title {
          font-size: 15px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #212529;
          margin-bottom: 22px;
        }

        .checkout-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #343a40;
          margin-bottom: 7px;
        }

        .checkout-input {
          width: 100%;
          height: 44px;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 0 13px;
          font-size: 14px;
          font-family: 'Nunito', sans-serif;
          outline: none;
          margin-bottom: 16px;
        }

        .checkout-input:focus {
          border-color: #212529;
        }

        .checkout-textarea {
          width: 100%;
          min-height: 90px;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 12px 13px;
          font-size: 14px;
          font-family: 'Nunito', sans-serif;
          outline: none;
          resize: vertical;
        }

        .checkout-textarea:focus {
          border-color: #212529;
        }

        .checkout-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .checkout-item:last-child {
          border-bottom: none;
        }

        .checkout-item-img {
          width: 64px;
          height: 80px;
          border-radius: 8px;
          object-fit: cover;
          object-position: top;
          background: #f7f7f7;
          flex-shrink: 0;
        }

        .checkout-item-info {
          flex: 1;
          min-width: 0;
        }

        .checkout-item-name {
          font-size: 14px;
          font-weight: 700;
          color: #212529;
          margin-bottom: 4px;
        }

        .checkout-item-meta {
          font-size: 12px;
          color: #adb5bd;
        }

        .checkout-item-price {
          font-size: 14px;
          font-weight: 700;
          color: #212529;
          text-align: right;
          white-space: nowrap;
        }

        .checkout-summary {
          background: #fff;
          border: 1.5px solid #f0f0f0;
          border-radius: 16px;
          padding: 28px 24px;
          position: sticky;
          top: 86px;
        }

        .checkout-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          color: #6c757d;
          margin-bottom: 13px;
        }

        .checkout-summary-row strong {
          color: #212529;
          font-weight: 700;
        }

        .checkout-divider {
          border: none;
          border-top: 1px solid #f0f0f0;
          margin: 18px 0;
        }

        .checkout-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .checkout-total-label {
          font-size: 15px;
          font-weight: 800;
          color: #212529;
        }

        .checkout-total-value {
          font-size: 22px;
          font-weight: 900;
          color: #212529;
        }

        .checkout-btn {
          width: 100%;
          height: 50px;
          background: #212529;
          border: none;
          border-radius: 50px;
          color: #fff;
          font-size: 15px;
          font-weight: 800;
          font-family: 'Nunito', sans-serif;
          cursor: pointer;
          transition: background 0.18s;
        }

        .checkout-btn:hover {
          background: #871B1B;
        }

        .checkout-payment-option {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #e9ecef;
          border-radius: 10px;
          padding: 13px 14px;
          margin-bottom: 10px;
          cursor: pointer;
        }

        .checkout-payment-option input {
          accent-color: #212529;
        }

        .checkout-payment-text {
          font-size: 14px;
          font-weight: 600;
          color: #343a40;
        }

        @media (max-width: 1520px) {
          .checkout-page {
            padding: 28px 24px 56px;
          }
        }
      `}</style>

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
                    className="checkout-input"
                    placeholder="Nhập họ và tên"
                  />
                </div>

                <div className="col-md-6">
                  <label className="checkout-label">Số điện thoại</label>

                  <input
                    type="tel"
                    className="checkout-input"
                    placeholder="Nhập số điện thoại"
                  />
                </div>
              </div>

              <label className="checkout-label">Địa chỉ nhận hàng</label>

              <input
                type="text"
                className="checkout-input"
                placeholder="Nhập địa chỉ nhận hàng"
              />

              <label className="checkout-label">Ghi chú</label>

              <textarea
                className="checkout-textarea"
                placeholder="Ghi chú cho đơn hàng (nếu có)"
              />
            </div>

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
                      alt={item.product.product_name}
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

              <hr className="checkout-divider" />

              <div className="checkout-total">
                <span className="checkout-total-label">Tổng cộng</span>

                <span className="checkout-total-value">{fmt(totalPrice)}</span>
              </div>

              <button
                className="checkout-btn"
                onClick={() => {
                  // Tạm thời chưa gọi API tạo đơn
                  console.log("Đặt hàng:", selectedItems);
                }}
              >
                Đặt hàng
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

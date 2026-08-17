// frontend\src\pages\Cart\index.jsx
// frontend\src\pages\Cart\index.jsx
import { useContext, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";
import Swal from "sweetalert2";

/* ── helpers ── */
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";

/* ── SKELETON ROW ── */
function SkeletonRow() {
  return (
    <div className="cart-item placeholder-item">
      <div
        className="placeholder rounded"
        style={{ width: 80, height: 100, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="placeholder col-8 rounded mb-2"
          style={{ height: 16 }}
        />
        <div className="placeholder col-4 rounded" style={{ height: 13 }} />
      </div>
      <div className="placeholder rounded" style={{ width: 100, height: 36 }} />
      <div className="placeholder rounded" style={{ width: 80, height: 16 }} />
      <div className="placeholder rounded" style={{ width: 24, height: 24 }} />
    </div>
  );
}

export default function Cart() {
  const { cart, removeFromCart, increaseQuantity, decreaseQuantity } =
    useContext(CartContext);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const cartItems = cart?.items || [];

  /* simulate initial load */
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  /* auto-select all on first load */
  useEffect(() => {
    if (cartItems.length > 0 && selected.length === 0) {
      setSelected(
        cartItems.filter((i) => i.product).map((i) => i.cart_item_id),
      );
    }
  }, [cartItems]);

  const allSelected =
    selected.length === cartItems.length && cartItems.length > 0;
  const toggleAll = () =>
    setSelected(
      allSelected
        ? []
        : cartItems.filter((i) => i.product).map((i) => i.cart_item_id),
    );
  const toggleOne = (id) =>
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );

  const selectedItems = cartItems.filter(
    (i) => i.product && selected.includes(i.cart_item_id),
  );
  const totalQty = selectedItems.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = selectedItems.reduce(
    (s, i) =>
      s +
      (i.product.discount_price ?? i.product.original_price ?? 0) * i.quantity,
    0,
  );

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "Xoá sản phẩm?",
      text: "Sản phẩm sẽ bị xoá khỏi giỏ hàng.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Xoá",
      cancelButtonText: "Huỷ",
      reverseButtons: true,
      buttonsStyling: false,
      customClass: {
        popup: "se-swal-popup",
        title: "se-swal-title",
        htmlContainer: "se-swal-text",
        confirmButton: "se-btn-confirm",
        cancelButton: "se-btn-cancel",
        actions: "se-swal-actions",
      },
    });
    if (!res.isConfirmed) return;
    await removeFromCart(id);
    setSelected((p) => p.filter((x) => x !== id));
  };

  const handleDeleteSelected = async () => {
    if (selected.length === 0) return;
    const res = await Swal.fire({
      title: `Xoá ${selected.length} sản phẩm?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Xoá tất cả",
      cancelButtonText: "Huỷ",
      reverseButtons: true,
      buttonsStyling: false,
      customClass: {
        popup: "se-swal-popup",
        title: "se-swal-title",
        htmlContainer: "se-swal-text",
        confirmButton: "se-btn-confirm",
        cancelButton: "se-btn-cancel",
        actions: "se-swal-actions",
      },
    });
    if (!res.isConfirmed) return;
    for (const id of selected) await removeFromCart(id);
    setSelected([]);
  };

  /* ── EMPTY STATE ── */
  if (!loading && cartItems.length === 0) {
    return (
      <>
        <Helmet>
          <title>Giỏ hàng | Selene</title>
        </Helmet>
        <Breadcrumb
          items={[{ label: "Trang chủ", path: "/" }, { label: "Giỏ hàng" }]}
        />
        <div
          style={{
            padding: "80px 75px",
            textAlign: "center",
            background: "#fff",
          }}
        >
          <i
            className="bi bi-bag-x"
            style={{
              fontSize: 64,
              color: "#e0e0e0",
              display: "block",
              marginBottom: 20,
            }}
          />
          <h4 style={{ fontWeight: 800, color: "#212529", marginBottom: 8 }}>
            Giỏ hàng đang trống
          </h4>
          <p style={{ color: "#6c757d", fontSize: 15, marginBottom: 28 }}>
            Khám phá bộ sưu tập và chọn ngay những món đồ yêu thích!
          </p>
          <Link
            to="/san-pham"
            className="btn btn-dark fw-semibold px-5 form-btn"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Giỏ hàng | Selene</title>
      </Helmet>

      <style>{`
        /* ── LAYOUT ── */
        .cart-page { padding: 32px 75px 72px; background: #fff; min-height: 70vh; }

        /* ── HEADING ── */
        .cart-heading { font-size: 20px; font-weight: 800; color: #212529; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .cart-sub     { font-size: 14px; color: #adb5bd; margin-bottom: 0; }

        /* ── ITEM CARD ── */
        .cart-list { display: flex; flex-direction: column; gap: 0; }

        .cart-item {
          display: flex; align-items: center; gap: 18px;
          padding: 20px 0;
          border-bottom: 1px solid #f3f3f3;
          transition: background 0.15s;
        }
        .cart-item:first-child { border-top: 1px solid #f3f3f3; }

        .cart-item-img-wrap {
          position: relative; flex-shrink: 0;
          width: 90px; height: 112px;
          border-radius: 10px; overflow: hidden; background: #f7f7f7;
        }
        .cart-item-img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }

        .cart-item-info { flex: 1; min-width: 0; }
        .cart-item-name {
          font-size: 14.5px; font-weight: 700; color: #212529;
          text-decoration: none; display: block; margin-bottom: 4px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cart-item-name:hover { color: #871B1B; }
        .cart-item-meta { font-size: 12.5px; color: #adb5bd; }

        /* ── QTY STEPPER ── */
        .cart-qty {
          display: flex; align-items: center;
          border: 1.5px solid #e0e0e0; border-radius: 50px;
          height: 38px; overflow: hidden; flex-shrink: 0;
        }
        .cart-qty-btn {
          width: 38px; height: 100%; background: none; border: none;
          font-size: 17px; color: #555; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: color 0.15s;
        }
        .cart-qty-btn:hover:not(:disabled) { color: #212529; }
        .cart-qty-btn:disabled { opacity: 0.3; cursor: default; }
        .cart-qty-val { min-width: 32px; text-align: center; font-size: 15px; font-weight: 700; color: #212529; }

        /* ── PRICE ── */
        .cart-item-price { font-size: 15px; font-weight: 700; color: #212529; flex-shrink: 0; min-width: 110px; text-align: right; }
        .cart-item-subtotal { font-size: 15px; font-weight: 800; color: #212529; flex-shrink: 0; min-width: 110px; text-align: right; }

        /* delete btn */
        .cart-del-btn {
          background: none; border: none; cursor: pointer; padding: 6px;
          border-radius: 8px; color: #ccc; font-size: 18px;
          transition: color 0.15s, background 0.15s;
          flex-shrink: 0;
        }
        .cart-del-btn:hover { color: #871B1B; background: #fff0f0; }

        /* ── TOOLBAR ── */
        .cart-toolbar {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 0;
          border-bottom: 2px solid #212529;
          margin-bottom: 0;
        }
        .cart-check-all {
          display: flex; align-items: center; gap: 8px;
          font-size: 14px; font-weight: 600; color: #212529;
          cursor: pointer; user-select: none;
        }
        .cart-check-all input { width: 17px; height: 17px; accent-color: #212529; cursor: pointer; flex-shrink: 0; }
        .cart-del-sel {
          background: none; border: none; cursor: pointer;
          font-size: 13px; color: #adb5bd; font-family: 'Nunito', sans-serif;
          font-weight: 600; padding: 0; transition: color 0.15s;
        }
        .cart-del-sel:hover { color: #871B1B; }

        /* ── SUMMARY CARD ── */
        .cart-summary {
          background: #fff; border: 1.5px solid #f0f0f0;
          border-radius: 16px; padding: 28px 24px;
          position: sticky; top: 86px;
        }
        .cart-summary-title { font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #212529; margin-bottom: 22px; }
        .cart-summary-row {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 14px; color: #6c757d; margin-bottom: 12px;
        }
        .cart-summary-row strong { color: #212529; font-weight: 700; }
        .cart-summary-divider { border: none; border-top: 1px solid #f0f0f0; margin: 16px 0; }
        .cart-summary-total {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px;
        }
        .cart-summary-total-label { font-size: 15px; font-weight: 800; color: #212529; }
        .cart-summary-total-val   { font-size: 22px; font-weight: 900; color: #212529; }

        .cart-checkout-btn {
          width: 100%; height: 50px; background: #212529; border: none;
          border-radius: 50px; color: #fff;
          font-size: 15px; font-weight: 800; font-family: 'Nunito', sans-serif;
          letter-spacing: 0.5px; cursor: pointer;
          transition: background 0.18s, transform 0.1s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .cart-checkout-btn:hover:not(:disabled) { background: #871B1B; }
        .cart-checkout-btn:active { transform: scale(0.98); }
        .cart-checkout-btn:disabled { opacity: 0.4; cursor: default; }

        .cart-secure { font-size: 12px; color: #adb5bd; text-align: center; margin-top: 12px; }

        /* item checkbox */
        .cart-item-check { width: 17px; height: 17px; accent-color: #212529; cursor: pointer; flex-shrink: 0; }

        /* col labels */
        .cart-col-labels {
          display: flex; align-items: center; gap: 18px;
          padding: 0 0 10px;
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.7px; color: #adb5bd;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 1520px) { .cart-page { padding: 28px 24px 56px; } }
        @media (max-width: 768px) {
          .cart-item-price  { display: none; }
          .cart-col-labels  { display: none; }
        }
      `}</style>

      <Breadcrumb
        items={[{ label: "Trang chủ", path: "/" }, { label: "Giỏ hàng" }]}
      />

      <div className="cart-page">
        <div className="row g-5 align-items-start">
          {/* ══════════════════ CỘT TRÁI: DANH SÁCH ══════════════════ */}
          <div className="col-12 col-lg-8">
            {/* heading */}
            <div className="d-flex align-items-baseline gap-3 mb-4">
              <h1 className="cart-heading">Giỏ hàng</h1>
              {!loading && (
                <span className="cart-sub">{cart.total_quantity} sản phẩm</span>
              )}
            </div>

            {/* toolbar */}
            <div className="cart-toolbar">
              <label className="cart-check-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={loading}
                />
                Chọn tất cả
              </label>

              {selected.length > 0 && (
                <button className="cart-del-sel" onClick={handleDeleteSelected}>
                  <i className="bi bi-trash3 me-1" />
                  Xoá ({selected.length})
                </button>
              )}
            </div>

            {/* items */}
            <div className="cart-list">
              {loading
                ? [1, 2, 3].map((k) => <SkeletonRow key={k} />)
                : cartItems
                    .filter((i) => i.product)
                    .map((item) => (
                      <div className="cart-item" key={item.cart_item_id}>
                        {/* checkbox */}
                        <input
                          type="checkbox"
                          className="cart-item-check"
                          checked={selected.includes(item.cart_item_id)}
                          onChange={() => toggleOne(item.cart_item_id)}
                        />

                        {/* image */}
                        <div className="cart-item-img-wrap">
                          <Link to={`/san-pham/${item.product.product_id}`}>
                            <img
                              src={item.product.image_url || "/placeholder.jpg"}
                              alt={item.product.product_name}
                              className="cart-item-img"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.jpg";
                              }}
                            />
                          </Link>
                        </div>

                        {/* info */}
                        <div className="cart-item-info">
                          <Link
                            to={`/san-pham/${item.product.product_id}`}
                            className="cart-item-name"
                          >
                            {item.product.product_name}
                          </Link>
                          {item.product.color && (
                            <span className="cart-item-meta">
                              Màu: {item.product.color}
                            </span>
                          )}

                          {item.product.size && (
                            <span className="cart-item-meta ms-2">
                              · Size: {item.product.size}
                            </span>
                          )}
                        </div>

                        {/* đơn giá */}
                        <div className="cart-item-price">
                          {fmt(
                            item.product.discount_price ??
                              item.product.original_price ??
                              0,
                          )}
                        </div>

                        {/* qty stepper */}
                        <div className="cart-qty">
                          <button
                            className="cart-qty-btn"
                            disabled={item.quantity <= 1}
                            onClick={() => decreaseQuantity(item.cart_item_id)}
                          >
                            <i className="bi bi-dash" />
                          </button>
                          <span className="cart-qty-val">{item.quantity}</span>
                          <button
                            className="cart-qty-btn"
                            disabled={
                              item.quantity >=
                              (item.product.stock_quantity ?? 0)
                            }
                            onClick={() => increaseQuantity(item.cart_item_id)}
                          >
                            <i className="bi bi-plus" />
                          </button>
                        </div>

                        {/* thành tiền */}
                        <div className="cart-item-subtotal">
                          {fmt(
                            (item.product.discount_price ??
                              item.product.original_price ??
                              0) * item.quantity,
                          )}
                        </div>

                        {/* delete */}
                        <button
                          className="cart-del-btn"
                          onClick={() => handleDelete(item.cart_item_id)}
                          title="Xoá sản phẩm"
                        >
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    ))}
            </div>

            {/* back link */}
            <div className="mt-4">
              <Link
                to="/san-pham"
                className="d-inline-flex align-items-center gap-2 form-link-sm"
                style={{ fontSize: 14 }}
              >
                <i className="bi bi-arrow-left" />
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>

          {/* ══════════════════ CỘT PHẢI: TỔNG ĐƠN ══════════════════ */}
          <div className="col-12 col-lg-4">
            <div className="cart-summary">
              <div className="cart-summary-title">Tóm tắt đơn hàng</div>

              {loading ? (
                <div className="placeholder-glow">
                  <div
                    className="placeholder col-8 rounded mb-3"
                    style={{ height: 16 }}
                  />
                  <div
                    className="placeholder col-6 rounded mb-2"
                    style={{ height: 14 }}
                  />
                  <div
                    className="placeholder col-5 rounded mb-4"
                    style={{ height: 14 }}
                  />
                  <div
                    className="placeholder w-100 rounded-pill"
                    style={{ height: 50 }}
                  />
                </div>
              ) : (
                <>
                  <div className="cart-summary-row">
                    <span>Tạm tính ({totalQty} sản phẩm)</span>
                    <strong>{fmt(totalPrice)}</strong>
                  </div>
                  <div className="cart-summary-row">
                    <span>Phí vận chuyển</span>
                    <span style={{ color: "#28a745", fontWeight: 700 }}>
                      Miễn phí
                    </span>
                  </div>

                  <hr className="cart-summary-divider" />

                  <div className="cart-summary-total">
                    <span className="cart-summary-total-label">Tổng cộng</span>
                    <span className="cart-summary-total-val">
                      {fmt(totalPrice)}
                    </span>
                  </div>

                  <button
                    className="cart-checkout-btn"
                    disabled={selected.length === 0}
                    onClick={() =>
                      navigate("/thanh-toan", { state: { selected } })
                    }
                  >
                    <i className="bi bi-bag-check" />
                    Thanh toán ngay
                  </button>

                  <p className="cart-secure">
                    <i className="bi bi-shield-check me-1" />
                    Thanh toán an toàn · Bảo mật 100%
                  </p>

                  {/* payment icons */}
                  <div className="d-flex justify-content-center gap-2 mt-3 flex-wrap">
                    {[
                      "bi-credit-card",
                      "bi-wallet2",
                      "bi-bank",
                      "bi-qr-code",
                    ].map((ic) => (
                      <div
                        key={ic}
                        style={{
                          border: "1px solid #eee",
                          borderRadius: 8,
                          padding: "5px 10px",
                          fontSize: 18,
                          color: "#adb5bd",
                        }}
                      >
                        <i className={`bi ${ic}`} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

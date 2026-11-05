import EmptyState from "../../components/common/EmptyState";
import ProductLink from "../../components/common/ProductLink";
// frontend\src\pages\Cart\index.jsx
// frontend\src\pages\Cart\index.jsx
import Loading from "../../components/common/Loading";
import { useContext, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";
import Swal from "sweetalert2";

/* ── helpers ── */
const EMPTY_ITEMS = [];

const fmt = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";

export default function Cart() {
  const {
    cart,
    removeFromCart,
    removeMultipleFromCart,
    increaseQuantity,
    decreaseQuantity,
    flushPendingUpdates,
  } = useContext(CartContext);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const cartItems = cart?.items || EMPTY_ITEMS;

  /* simulate initial load */
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const isOutOfStock = (item) =>
    !item.product ||
    Boolean(item.product.error) ||
    (item.product.status && item.product.status !== "active") ||
    (item.product.product_status && item.product.product_status !== "active") ||
    Number(item.product.stock_quantity ?? 0) <= 0;

  const validCartItems = cartItems.filter((i) => i.product);
  const availableCartItems = validCartItems.filter((i) => !isOutOfStock(i));
  const outOfStockCartItems = validCartItems.filter((i) => isOutOfStock(i));

  /* auto-select all available items on first load and synchronize selection when cartItems changes */
  const [previousCartItems, setPreviousCartItems] = useState(null);
  if (previousCartItems !== cartItems) {
    setPreviousCartItems(cartItems);

    const currentAvailableIds = availableCartItems.map((i) => i.cart_item_id);

    if (!previousCartItems) {
      // Lần đầu tải giỏ hàng: Chỉ chọn tất cả sản phẩm CÒN HÀNG
      setSelected(currentAvailableIds);
    } else {
      const prevAvailableItems = (previousCartItems || [])
        .filter((i) => i.product)
        .filter((i) => !isOutOfStock(i));
      const prevAvailableIds = prevAvailableItems.map((i) => i.cart_item_id);

      // Kiểm tra xem trước đó người dùng có đang "Chọn tất cả" hay không
      const wasAllSelected =
        prevAvailableIds.length > 0 &&
        prevAvailableIds.every((id) => selected.includes(id));

      if (wasAllSelected || selected.length === 0) {
        setSelected(currentAvailableIds);
      } else {
        const nextSelected = [];

        availableCartItems.forEach((item) => {
          if (selected.includes(item.cart_item_id)) {
            nextSelected.push(item.cart_item_id);
            return;
          }

          const matchedPrev = prevAvailableItems.find(
            (p) =>
              selected.includes(p.cart_item_id) &&
              ((p.product?.variant_id &&
                item.product?.variant_id &&
                p.product.variant_id === item.product.variant_id) ||
                (p.variant_id &&
                  item.variant_id &&
                  p.variant_id === item.variant_id)),
          );
          if (matchedPrev) {
            nextSelected.push(item.cart_item_id);
            return;
          }

          const isNewlyAdded = !prevAvailableItems.some(
            (p) =>
              p.cart_item_id === item.cart_item_id ||
              (p.variant_id &&
                item.variant_id &&
                p.variant_id === item.variant_id) ||
              (p.product?.variant_id &&
                item.product?.variant_id &&
                p.product.variant_id === item.product.variant_id),
          );
          if (isNewlyAdded) {
            nextSelected.push(item.cart_item_id);
          }
        });

        setSelected(nextSelected);
      }
    }
  }

  // allSelected CHỈ TRUE khi TẤT CẢ các sản phẩm còn hàng đều có trong selected
  const allSelected =
    availableCartItems.length > 0 &&
    availableCartItems.every((i) => selected.includes(i.cart_item_id));

  const toggleAll = () =>
    setSelected(
      allSelected ? [] : availableCartItems.map((i) => i.cart_item_id),
    );

  const toggleOne = (id) => {
    const item = validCartItems.find((i) => i.cart_item_id === id);
    if (item && isOutOfStock(item)) return;
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  };

  const selectedItems = availableCartItems.filter((i) =>
    selected.includes(i.cart_item_id),
  );
  const totalQty = selectedItems.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = selectedItems.reduce(
    (s, i) =>
      s +
      (i.product.discount_price ?? i.product.original_price ?? 0) * i.quantity,
    0,
  );

  const handleDecrease = (item) => {
    if (item.quantity <= 1) {
      setSelected((p) => p.filter((x) => x !== item.cart_item_id));
    }
    decreaseQuantity(item.cart_item_id);
  };

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
    // Xoá ngay lập tức trên UI (0ms)
    setSelected((p) => p.filter((x) => x !== id));
    removeFromCart(id).catch((err) => {
      console.error("Lỗi khi xóa sản phẩm:", err);
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    const res = await Swal.fire({
      title: `Xoá ${selectedItems.length} sản phẩm?`,
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
    const idsToDelete = selectedItems.map((item) => item.cart_item_id);
    // Xoá ngay lập tức trên UI (0ms)
    setSelected([]);
    removeMultipleFromCart(idsToDelete).catch((err) => {
      console.error("Lỗi khi xóa nhiều sản phẩm:", err);
    });
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
          <EmptyState text="Không có sản phẩm nào để hiển thị" />
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
        }
        .cart-item:first-child { border-top: 1px solid #f3f3f3; }
        .cart-item.out-of-stock {
          opacity: 0.5;
          transition: opacity 0.2s;
        }
        .cart-item.out-of-stock:hover {
          opacity: 0.7;
        }
        .cart-item.out-of-stock .cart-item-img {
          filter: grayscale(45%);
        }

        .cart-item-img-wrap {
          position: relative; flex-shrink: 0;
          width: 90px; height: 112px;
          border-radius: 10px; overflow: hidden; background: #f7f7f7;
        }
        .cart-item-img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }

        .cart-item-badge-out {
          position: absolute;
          top: 18px;
          left: 18px;
          transform: translate(-50%, -50%) rotate(-45deg);
          width: 90px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          background: rgba(33, 37, 41, 0.92);
          color: #fff;
          font-size: 9.5px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: 0.3px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
          pointer-events: none;
          user-select: none;
        }

        .cart-out-tag {
          display: inline-block;
          background: #fff5f5;
          color: #dc3545;
          border: 1px solid #fecaca;
          font-size: 11px;
          font-weight: 700;
          padding: 1px 7px;
          border-radius: 4px;
          line-height: 1.4;
        }

        .cart-item-out-warning {
          font-size: 12px;
          font-weight: 600;
          line-height: 1.3;
        }

        .cart-qty.disabled {
          opacity: 0.45;
          background: #f5f5f5;
          border-color: #e5e5e5;
        }
        .cart-qty.disabled .cart-qty-btn {
          cursor: not-allowed;
          pointer-events: none;
        }



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
          font-size: 13px; color: #adb5bd; font-family: 'Manrope', sans-serif;
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
          font-size: 15px; font-weight: 800; font-family: 'Manrope', sans-serif;
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
                  disabled={loading || availableCartItems.length === 0}
                />
                Chọn tất cả {availableCartItems.length > 0 && `(${availableCartItems.length})`}
              </label>

              {selectedItems.length > 0 && (
                <button className="cart-del-sel" onClick={handleDeleteSelected}>
                  <i className="bi bi-trash3 me-1" />
                  Xoá ({selectedItems.length})
                </button>
              )}
            </div>

            {/* items */}
            <div className="cart-list">
              {loading ? (
                <div className="py-5">
                  <Loading text="Đang tải giỏ hàng..." />
                </div>
              ) : (
                cartItems
                  .filter((i) => i.product)
                  .map((item) => {
                    const itemOutOfStock = isOutOfStock(item);

                    return (
                      <div
                        className={`cart-item${itemOutOfStock ? " out-of-stock" : ""}`}
                        key={item.cart_item_id}
                      >
                        {/* checkbox */}
                        <input
                          type="checkbox"
                          className="cart-item-check"
                          checked={!itemOutOfStock && selected.includes(item.cart_item_id)}
                          onChange={() => toggleOne(item.cart_item_id)}
                          disabled={itemOutOfStock}
                          title={itemOutOfStock ? "Sản phẩm đã hết hàng" : undefined}
                        />

                        {/* image */}
                        <div className="cart-item-img-wrap">
                          {itemOutOfStock && (
                            <span className="cart-item-badge-out">Hết hàng</span>
                          )}
                          <ProductLink productId={item.product.product_id}>
                            <img
                              src={item.product.image_url || "/placeholder.jpg"}
                              alt=""
                              className="cart-item-img"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.jpg";
                              }}
                            />
                          </ProductLink>
                        </div>

                        {/* info */}
                        <div className="cart-item-info">
                          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                            <ProductLink
                              productId={item.product.product_id}
                              className="cart-item-name mb-0"
                            >
                              {item.product.product_name}
                            </ProductLink>
                            {itemOutOfStock && (
                              <span className="cart-out-tag">Hết hàng</span>
                            )}
                          </div>
                          <div>
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
                          {!itemOutOfStock &&
                            item.product?.stock_quantity !== undefined &&
                            item.quantity > Number(item.product.stock_quantity) && (
                              <div className="cart-item-out-warning text-danger mt-1">
                                <i className="bi bi-exclamation-triangle me-1" />
                                Số lượng vượt quá tồn kho (kho còn {item.product.stock_quantity} sp)
                              </div>
                            )}
                        </div>

                        {/* đơn giá */}
                        <div className="cart-item-price">
                          {itemOutOfStock ? (
                            <span className="text-muted text-decoration-line-through">
                              {fmt(
                                item.product.discount_price ??
                                  item.product.original_price ??
                                  0,
                              )}
                            </span>
                          ) : (
                            fmt(
                              item.product.discount_price ??
                                item.product.original_price ??
                                0,
                            )
                          )}
                        </div>

                        {/* qty stepper */}
                        <div className={`cart-qty${itemOutOfStock ? " disabled" : ""}`}>
                          <button
                            className="cart-qty-btn"
                            onClick={() => handleDecrease(item)}
                            disabled={itemOutOfStock}
                            title={
                              item.quantity <= 1
                                ? "Xoá sản phẩm khỏi giỏ hàng"
                                : "Giảm số lượng"
                            }
                          >
                            <i className="bi bi-dash" />
                          </button>
                          <span className="cart-qty-val">{item.quantity}</span>
                          <button
                            className="cart-qty-btn"
                            onClick={() => increaseQuantity(item.cart_item_id)}
                            disabled={
                              itemOutOfStock ||
                              (item.product?.stock_quantity !== undefined &&
                                item.quantity >= Number(item.product.stock_quantity))
                            }
                            title={
                              item.product?.stock_quantity !== undefined &&
                              item.quantity >= Number(item.product.stock_quantity)
                                ? "Đã đạt số lượng tồn kho tối đa"
                                : "Tăng số lượng"
                            }
                          >
                            <i className="bi bi-plus" />
                          </button>
                        </div>

                        {/* thành tiền */}
                        <div className="cart-item-subtotal">
                          {itemOutOfStock ? (
                            <span className="text-muted text-decoration-line-through">
                              {fmt(
                                (item.product.discount_price ??
                                  item.product.original_price ??
                                  0) * item.quantity,
                              )}
                            </span>
                          ) : (
                            fmt(
                              (item.product.discount_price ??
                                item.product.original_price ??
                                0) * item.quantity,
                            )
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
                    );
                  })
              )}
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
                <div className="py-5">
                  <Loading text="Đang tải tóm tắt đơn hàng..." />
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
                    disabled={selectedItems.length === 0}
                    onClick={async () => {
                      const hasOutOfStock = selectedItems.some((i) =>
                        isOutOfStock(i),
                      );
                      const hasExceededStock = selectedItems.some(
                        (i) =>
                          i.product?.stock_quantity !== undefined &&
                          i.quantity > Number(i.product.stock_quantity),
                      );
                      if (hasOutOfStock) {
                        Swal.fire({
                          icon: "warning",
                          title: "Có sản phẩm hết hàng",
                          text: "Vui lòng bỏ chọn hoặc xóa sản phẩm đã hết hàng trước khi thanh toán.",
                        });
                        return;
                      }
                      if (hasExceededStock) {
                        Swal.fire({
                          icon: "warning",
                          title: "Số lượng vượt quá tồn kho",
                          text: "Vui lòng điều chỉnh lại số lượng sản phẩm không vượt quá tồn kho trước khi thanh toán.",
                        });
                        return;
                      }

                      if (flushPendingUpdates) {
                        await flushPendingUpdates();
                      }
                      navigate("/thanh-toan", {
                        state: {
                          selected: selectedItems.map((i) => i.cart_item_id),
                        },
                      });
                    }}
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

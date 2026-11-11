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

import EmptyState from "../../components/common/EmptyState";
// frontend\src\pages\ProductDetail.jsx
import ProductDetailSkeleton from "./Skeleton";
import { useState, useEffect, useLayoutEffect, useContext } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";
import {
  getProductById,
  getCachedProductById,
} from "../../services/product.service";
import { CartContext } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { FAQS, COMMITS, SIZE_GUIDE_IMAGE, getColorImage } from "./constants";
import ImageModal from "./ImageModal";
import { toast } from "react-toastify";
import { isLoggedIn } from "../../utils/auth";

function fmt(n) {
  return n.toLocaleString("vi-VN") + "đ";
}

export default function ProductDetail() {
  const { id } = useParams();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [id]);

  return <ProductDetailContent key={id} id={id} />;
}

function ProductDetailContent({ id }) {
  const { state } = useLocation();
  const parentBreadcrumb = state?.from === "/yeu-thich"
    ? { label: "Yêu thích", path: "/yeu-thich" }
    : { label: "Sản phẩm", path: "/san-pham" };
  const { isFavorite, toggleWishlist } = useWishlist();
  const [modal, setModal] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [failedImages, setFailedImages] = useState([]);
  const [activeColor, setColor] = useState(0);
  const [activeSize, setSize] = useState(0);
  const [qty, setQty] = useState(1);
  const [showMore, setShowMore] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [copied, setCopied] = useState(false);
  const [product, setProduct] = useState(
    () => getCachedProductById(id)?.data ?? null,
  );
  const [loading, setLoading] = useState(() => !getCachedProductById(id)?.data);
  const { cart, addToCart } = useContext(CartContext);

  useEffect(() => {
    let active = true;
    const fetchProduct = async () => {
      try {
        const res = await getProductById(id);

        if (active) setProduct(res.data);
      } catch (err) {
        if (active) setProduct(null);
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProduct();
    return () => {
      active = false;
    };
  }, [id]);

  const copySku = () => {
    navigator.clipboard?.writeText(product?.product_id || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return <ProductDetailSkeleton parentBreadcrumb={parentBreadcrumb} />;
  }

  if (!product) {
    return (
      <div style={{ padding: 40 }}>
        <EmptyState text="Không có sản phẩm nào để hiển thị" />
      </div>
    );
  }

  const PRODUCT = {
    ...product,

    name: product.product_name,
    price: product.discount_price,
    originalPrice: product.original_price,
    sku: product.product_id,

    images: (Array.isArray(product.images) ? product.images : []).filter(
      (src) =>
        typeof src === "string" && src.trim() && !failedImages.includes(src),
    ),
    faqs: FAQS,
    commits: COMMITS,

    colors: [
      ...new Map(
        (product.variants || []).map((v) => [
          v.color,
          {
            label: v.color,
            image: getColorImage(v.color),
          },
        ]),
      ).values(),
    ],

    sizes: [...new Set((product.variants || []).map((v) => v.size))],

    detail: {
      sku: product.product_id,
      title: product.product_name,
      lines: (product.description || "").split("\n"),
    },
  };

  const activeImg = Math.max(0, PRODUCT.images.indexOf(selectedImage));
  const hideFailedImage = (src) => {
    setFailedImages((previous) =>
      previous.includes(src) ? previous : [...previous, src],
    );
  };
  const selectedColor = PRODUCT.colors[activeColor]?.label;
  const selectedSize = PRODUCT.sizes[activeSize];

  const selectedVariant = (product.variants || []).find(
    (v) => v.color === selectedColor && v.size === selectedSize,
  );
  const isCurrentOutOfStock =
    !selectedVariant || Number(selectedVariant.stock_quantity || 0) <= 0;
  const isAllSizesOutOfStock =
    Array.isArray(product.variants) &&
    product.variants.length > 0 &&
    product.variants.every((v) => Number(v.stock_quantity || 0) <= 0);

  console.log("PRODUCT:", product);
  console.log("VARIANTS:", product.variants);
  console.log("SELECTED VARIANT:", selectedVariant);

  return (
    <>
      <Helmet>
        <title>{PRODUCT.name ? `${PRODUCT.name} | Selene` : "Selene"}</title>
      </Helmet>

      <div className="pd-breadcrumb">
        <Breadcrumb
          items={[
            { label: "Trang chủ", path: "/" },
            parentBreadcrumb,
            { label: PRODUCT.name },
          ]}
        />
      </div>


      {modal && (modal === "size" || PRODUCT.images.length > 0) && (
        <ImageModal
          title={modal === "size" ? "Hướng dẫn chọn size" : PRODUCT.name}
          fullscreen={modal === "zoom"}
          src={modal === "size" ? SIZE_GUIDE_IMAGE : PRODUCT.images[activeImg]}
          alt=""
          onError={
            modal === "zoom"
              ? () => hideFailedImage(PRODUCT.images[activeImg])
              : undefined
          }
          note={
            modal === "size"
              ? "Bảng size tham khảo. Liên hệ tư vấn để chọn kích thước phù hợp với sản phẩm."
              : undefined
          }
          onClose={() => setModal(null)}
        />
      )}
      <div className="pd-page">
        <div className="pd-layout">
          {/* ════════════ CỘT TRÁI ════════════ */}
          <div className="pd-left">
            {/* GALLERY */}
            {PRODUCT.images.length > 0 && (
              <div className="pd-gallery">
                <div className="pd-thumbs">
                  {PRODUCT.images.map((img, i) => (
                    <img
                      key={img}
                      src={img}
                      alt=""
                      className={`pd-thumb${activeImg === i ? " active" : ""}`}
                      onClick={() => setSelectedImage(img)}
                      onError={() => hideFailedImage(img)}
                    />
                  ))}
                </div>

                <div className="pd-main-img-wrap">
                  {isAllSizesOutOfStock && (
                    <span className="pl-badge-out-of-stock">Hết hàng</span>
                  )}
                  <img
                    key={PRODUCT.images[activeImg]}
                    src={PRODUCT.images[activeImg]}
                    onError={() => hideFailedImage(PRODUCT.images[activeImg])}
                    alt=""
                    className="pd-main-img"
                  />

                  <button
                    className="slider-arrow prev"
                    aria-label="Ảnh trước"
                    disabled={PRODUCT.images.length < 2}
                    onClick={() =>
                      setSelectedImage(
                        PRODUCT.images[
                          (activeImg - 1 + PRODUCT.images.length) %
                            PRODUCT.images.length
                        ],
                      )
                    }
                  >
                    <i className="bi bi-caret-left" aria-hidden="true" />
                  </button>
                  <button
                    className="slider-arrow next"
                    aria-label="Ảnh tiếp theo"
                    disabled={PRODUCT.images.length < 2}
                    onClick={() =>
                      setSelectedImage(
                        PRODUCT.images[(activeImg + 1) % PRODUCT.images.length],
                      )
                    }
                  >
                    <i className="bi bi-caret-right" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    className="pd-zoom"
                    onClick={() => setModal("zoom")}
                    aria-label="Phóng to ảnh sản phẩm"
                  >
                    <i className="bi bi-zoom-in" />
                  </button>
                </div>
              </div>
            )}

            {/* CHI TIẾT SẢN PHẨM */}
            <div className="pd-section-card">
              <h3>Chi tiết sản phẩm</h3>
              <div className="pd-detail-sku">
                {PRODUCT.detail.sku}
                <button
                  className="pd-sku-copy"
                  onClick={copySku}
                  title="Sao chép"
                >
                  <i className={`bi ${copied ? "bi-check2" : "bi-copy"}`} />
                </button>
              </div>
              <p className="pd-detail-title">{PRODUCT.detail.title}</p>
              <p className="pd-detail-label">CHI TIẾT SẢN PHẨM</p>

              <div
                className={
                  !showMore
                    ? "pd-detail-blur pd-detail-lines"
                    : "pd-detail-lines"
                }
                style={!showMore ? { maxHeight: 120, overflow: "hidden" } : {}}
              >
                {PRODUCT.detail.lines.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </div>

              {!showMore && (
                <button
                  className="pd-showmore-btn"
                  onClick={() => setShowMore(true)}
                >
                  Xem thêm
                </button>
              )}
            </div>

            {/* CÂU HỎI THƯỜNG GẶP */}
            <div className="pd-section-card">
              <div className="pd-faq-head">
                <span>Câu hỏi thường gặp</span>
                <i className="bi bi-dash-circle" />
              </div>
              {(PRODUCT.faqs || []).map((faq, i) => (
                <div className="pd-faq-item" key={i}>
                  <button
                    type="button"
                    aria-expanded={openFaq === i}
                    className="pd-faq-q"
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  >
                    <span>{faq.q}</span>
                    <i
                      className={`bi ${openFaq === i ? "bi-dash" : "bi-plus"}`}
                    />
                  </button>
                  {openFaq === i && faq.a && (
                    <div className="pd-faq-a">
                      {faq.bold
                        ? faq.a.split(faq.bold).map((part, pi) =>
                            pi === 0 ? (
                              <span key={pi}>
                                {part}
                                <strong style={{ color: "#871B1B" }}>
                                  {faq.bold}
                                </strong>
                              </span>
                            ) : (
                              <span key={pi}>{part}</span>
                            ),
                          )
                        : faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ════════════ CỘT PHẢI (sticky) ════════════ */}
          <div className="pd-right">
            {/* Giá */}
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="pd-price">{fmt(PRODUCT.price)}</div>
              {PRODUCT.originalPrice > PRODUCT.price && (
                <del className="text-muted fs-6">
                  {fmt(PRODUCT.originalPrice)}
                </del>
              )}
            </div>

            {/* Tên */}
            <div className="pd-name">{PRODUCT.name}</div>

            {/* SKU */}
            <div className="pd-sku">
              {PRODUCT.sku}
              <button
                className="pd-sku-copy"
                onClick={copySku}
                title="Sao chép"
              >
                <i className={`bi ${copied ? "bi-check2" : "bi-copy"}`} />
              </button>
            </div>

            {/* Màu sắc */}
            <div className="pd-section-label">
              Màu sắc: <strong>{PRODUCT.colors[activeColor]?.label}</strong>
            </div>
            <div className="pd-colors">
              {PRODUCT.colors.map((c, i) => (
                <button
                  key={i}
                  className={`pd-color-btn${activeColor === i ? " active" : ""}`}
                  onClick={() => setColor(i)}
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={activeColor === i}
                >
                  <img className="pd-color-swatch" src={c.image} alt="" />
                </button>
              ))}
            </div>

            {/* Kích thước */}
            <div className="pd-size-row">
              <div className="pd-section-label mb-0">
                Kích thước: <strong>{PRODUCT.sizes[activeSize]}</strong>
                {isCurrentOutOfStock && (
                  <span className="pd-out-of-stock-tag ms-2">(Hết hàng)</span>
                )}
              </div>
              <button
                type="button"
                className="pd-guide-link"
                onClick={() => setModal("size")}
              >
                Hướng dẫn chọn size
              </button>
            </div>
            <div className="pd-sizes">
              {PRODUCT.sizes.map((sz, i) => {
                const variantForSz = (product.variants || []).find(
                  (v) => v.color === selectedColor && v.size === sz,
                );
                const szStock = Number(variantForSz?.stock_quantity ?? 0);
                const isOutOfStock = !variantForSz || szStock <= 0;
                const isActive = activeSize === i;

                return (
                  <button
                    key={i}
                    type="button"
                    className={`pd-size-btn${isActive ? " active" : ""}${isOutOfStock ? " out-of-stock" : ""}`}
                    onClick={() => setSize(i)}
                    title={isOutOfStock ? `${sz} (Hết hàng)` : sz}
                    aria-label={isOutOfStock ? `${sz} - Hết hàng` : sz}
                    aria-pressed={isActive}
                  >
                    <span className="pd-size-text">{sz}</span>
                    {isOutOfStock && (
                      <svg
                        className="pd-size-x-mark"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <line x1="0" y1="0" x2="100" y2="100" />
                        <line x1="100" y1="0" x2="0" y2="100" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Qty + Thêm vào giỏ */}
            <div className="pd-action-row">
              {isCurrentOutOfStock ? (
                <button
                  type="button"
                  className="pd-btn-cart pd-btn-cart-disabled"
                  disabled
                  aria-disabled="true"
                >
                  <i className="bi bi-slash-circle" />
                  Hết hàng
                </button>
              ) : (
                <>
                  <div className="pd-qty">
                    <button
                      className="pd-qty-btn"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                    >
                      <i className="bi bi-dash" />
                    </button>
                    <span className="pd-qty-val">{qty}</span>
                    <button
                      className="pd-qty-btn"
                      onClick={() => setQty((q) => q + 1)}
                    >
                      <i className="bi bi-plus" />
                    </button>
                  </div>

                  <button
                    className="pd-btn-cart"
                    onClick={() => {
                      // 1. Kiểm tra biến thể và tồn kho tại chỗ (0ms)
                      if (!selectedVariant) {
                        toast.error("Sản phẩm bạn chọn đã hết");
                        return;
                      }

                      const stock = Number(selectedVariant.stock_quantity || 0);
                      if (stock <= 0) {
                        toast.error("Sản phẩm bạn chọn đã hết");
                        return;
                      }

                      // Kiểm tra số lượng đã có sẵn trong giỏ hàng + số lượng muốn thêm
                      const existingInCart = cart?.items?.find(
                        (item) =>
                          item.product?.variant_id === selectedVariant.variant_id ||
                          item.variant_id === selectedVariant.variant_id,
                      );
                      const currentInCartQty = existingInCart
                        ? Number(existingInCart.quantity || 0)
                        : 0;

                      if (currentInCartQty + qty > stock) {
                        toast.error("Sản phẩm bạn chọn đã hết");
                        return;
                      }

                      if (!isLoggedIn()) {
                        toast.warning("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!");
                        return;
                      }

                      // 2. ĐÃ VƯỢT QUA KIỂM TRA TỒN KHO: Phản hồi ngay lập tức (0ms)
                      toast.success("Đã thêm sản phẩm vào giỏ hàng!");

                      // 3. Snapshot dữ liệu sản phẩm để cập nhật lạc quan (Optimistic)
                      const snapshot = {
                        product_id: product.product_id,
                        variant_id: selectedVariant.variant_id,
                        product_name: product.product_name,
                        image_url:
                          PRODUCT.colors?.[activeColor]?.image ||
                          (Array.isArray(product.images) && product.images[0]) ||
                          product.image_url,
                        original_price:
                          selectedVariant.original_price || product.original_price,
                        discount_price:
                          selectedVariant.discount_price ||
                          selectedVariant.price ||
                          product.discount_price,
                        stock_quantity: stock,
                        size: selectedVariant.size,
                        color: selectedVariant.color,
                      };

                      // 4. Gửi API lên server chạy ngầm (asynchronous) không chặn giao diện
                      addToCart(
                        product.product_id,
                        selectedVariant.variant_id,
                        qty,
                        snapshot,
                      ).catch((error) => {
                        // Nếu server trả về lỗi / hết hàng -> Hoàn tác và thông báo
                        toast.error(
                          error.response?.data?.message || "Sản phẩm bạn chọn đã hết",
                        );
                        console.error(
                          "Lỗi thêm giỏ hàng:",
                          error.response?.data || error,
                        );
                      });
                    }}
                  >
                    Thêm vào giỏ&nbsp;
                    <i className="bi bi-handbag" />
                  </button>
                </>
              )}
              <button
                type="button"
                className={`pd-wishlist${isFavorite(product.product_id) ? " active" : ""}`}
                onClick={() => toggleWishlist(product)}
                aria-pressed={isFavorite(product.product_id)}
                aria-label={
                  isFavorite(product.product_id)
                    ? "Bỏ yêu thích"
                    : "Thêm vào yêu thích"
                }
              >
                <i
                  className={`bi ${isFavorite(product.product_id) ? "bi-suit-heart-fill" : "bi-suit-heart"}`}
                />
              </button>
            </div>

            {/* Cam kết */}
            <div className="pd-commit-title">
              <span>SELENE cam kết</span>
              <i
                className="bi bi-patch-check"
                style={{ color: "#871B1B", fontSize: 20 }}
              />
            </div>
            <div className="pd-commit-grid">
              {(PRODUCT.commits || []).map((c, i) => (
                <div className="pd-commit-card" key={i}>
                  <i className={`bi ${c.icon}`} />
                  <div className="pd-commit-text">
                    <strong>{c.text1}</strong>
                    {c.text2 && " " + c.text2}
                    {c.link && (
                      <>
                        <br />
                        <Link to={c.path}>{c.link}</Link>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

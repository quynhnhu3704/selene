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

      <style>{`
        /* ════════════════════
           LAYOUT
        ════════════════════ */
        .pd-breadcrumb { padding: 0 75px; }
        .pd-breadcrumb > .container { width: 100%; max-width: none; margin: 0 !important; }
        .pd-page { padding: 28px 75px 64px; background: #fff; }

        .pd-layout {
          display: flex;
          gap: 40px;
          align-items: flex-start;
        }

        /* LEFT: gallery + tabs */
        .pd-left {
          flex: 0 0 52%;
          max-width: 52%;
        }

        /* RIGHT: sticky */
        .pd-right {
          flex: 1 1 0;
          min-width: 0;
          position: sticky;
          top: 80px;
          max-height: calc(100vh - 100px);
          overflow-y: auto;
          scrollbar-width: none;
          padding-bottom: 24px;
        }
        .pd-right::-webkit-scrollbar { display: none; }

        /* ════════════════════
           GALLERY
        ════════════════════ */
        .pd-gallery { display: flex; gap: 10px; }

        .pd-thumbs {
          display: flex; flex-direction: column; gap: 8px; flex: 0 0 92px;
        }
        .pd-thumb {
          width: 92px; height: 116px;
          object-fit: cover; object-position: top;
          border: 2px solid transparent; border-radius: 6px;
          cursor: pointer; transition: border-color 0.15s;
        }
        .pd-thumb.active  { border-color: #871B1B; }
        .pd-thumb:hover   { border-color: #6c757d; }

        .pd-main-img-wrap {
          flex: 1 1 0; position: relative;
          border-radius: 8px; overflow: hidden; background: #f5f5f5;
        }
        .pd-main-img {
          width: 100%; aspect-ratio: 3/4;
          object-fit: cover; object-position: top; display: block;
        }

        /* ════════════════════
           RIGHT PANEL
        ════════════════════ */
        .pd-price { font-size: 26px; font-weight: 800; color: #871B1B; margin-bottom: 6px; }
        .pd-name  { font-size: 17px; font-weight: 700; color: #212529; line-height: 1.45; margin-bottom: 6px; }
        .pd-sku   { font-size: 13px; color: #6c757d; margin-bottom: 18px; display: flex; align-items: center; gap: 6px; }
        .pd-sku-copy {
          background: none; border: none; cursor: pointer;
          color: #6c757d; font-size: 14px; padding: 0; display: flex; align-items: center;
        }
        .pd-sku-copy:hover { color: #212529; }

        .pd-section-label { font-size: 14.5px; font-weight: 600; color: #212529; margin-bottom: 10px; }

        /* Màu */
        .pd-colors { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
        .pd-color-btn {
          width: 44px; height: 44px; border-radius: 50%;
          border: 2.5px solid transparent; cursor: pointer; padding: 2px;
          outline: none; background: none; transition: border-color 0.15s, transform 0.1s;
          display: flex; align-items: center; justify-content: center;
        }
        .pd-color-btn.active { border-color: #871B1B; }
        .pd-color-btn:hover:not(.active) { border-color: #adb5bd; }
        .pd-color-swatch { width: 34px; height: 34px; border-radius: 50%; display: block; object-fit: cover; }

        /* Size */
        .pd-size-row {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
        }
        .pd-out-of-stock-tag {
          color: #dc3545; font-size: 13px; font-weight: 700;
        }
        .pd-guide-link { background: none; border: none; padding: 0; font-size: 13.5px; font-weight: 600; color: #871B1B; text-decoration: none; }
        .pd-guide-link:hover { text-decoration: underline; }
        .pd-sizes { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 22px; }
        .pd-size-btn {
          position: relative;
          min-width: 72px; height: 40px; border-radius: 8px;
          border: 1.5px solid #d0d0d0; background: #fff;
          font-size: 14px; font-weight: 600; font-family: 'Manrope', sans-serif;
          color: #333; cursor: pointer; padding: 0 12px; transition: all 0.15s;
          display: inline-flex; align-items: center; justify-content: center;
          overflow: hidden; user-select: none;
        }
        .pd-size-btn.active { border-color: #871B1B; background: #fcf2f2; color: #871B1B; }
        .pd-size-btn:hover:not(.active):not(.out-of-stock) { border-color: #6c757d; }
        .pd-size-btn.out-of-stock {
          background: #f8f9fa;
          color: #888;
          border-color: #dee2e6;
        }
        .pd-size-btn.out-of-stock.active {
          border-color: #871B1B;
          background: #fcf2f2;
          color: #871B1B;
        }
        .pd-size-text {
          position: relative;
          z-index: 1;
        }
        .pd-size-x-mark {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2;
        }
        .pd-size-x-mark line {
          stroke: #dc3545;
          stroke-width: 1.8;
          stroke-linecap: round;
          opacity: 0.85;
        }

        /* Qty + cart */
        .pd-action-row { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
        .pd-qty {
          display: flex; align-items: center;
          border: 1.5px solid #d0d0d0; border-radius: 50px; overflow: hidden;
          height: 48px; flex-shrink: 0;
        }
        .pd-qty-btn {
          background: none; border: none; width: 44px; height: 100%;
          font-size: 18px; color: #333; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: color 0.15s;
        }
        .pd-qty-btn:hover { color: #871B1B; }
        .pd-qty-val { min-width: 36px; text-align: center; font-size: 16px; font-weight: 700; color: #212529; }
        .pd-btn-cart {
          flex: 1; height: 48px; background: #871B1B; border: none; border-radius: 50px;
          font-size: 16px; font-weight: 700; font-family: 'Manrope', sans-serif;
          color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.18s, transform 0.1s;
        }
        .pd-btn-cart:hover { background: #6f1515; }
        .pd-btn-cart:active { transform: scale(0.98); }
        .pd-btn-cart.pd-btn-cart-disabled {
          background: #f1f3f5 !important;
          color: #868e96 !important;
          border: 1.5px solid #dee2e6 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
        }

        /* Commit */
        .pd-commit-title {
          font-size: 14.5px; font-weight: 700; color: #212529;
          margin-bottom: 12px; display: flex; align-items: center; gap: 7px;
        }
        .pd-commit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .pd-commit-card {
          border: 1.5px solid #e9ecef; border-radius: 10px; padding: 12px 14px;
          display: flex; align-items: flex-start; gap: 10px;
        }
        .pd-commit-card i { font-size: 18px; color: #495057; flex-shrink: 0; margin-top: 2px; }
        .pd-commit-text { font-size: 13px; line-height: 1.55; color: #333; }
        .pd-commit-text strong { font-weight: 700; color: #212529; }
        .pd-commit-text a { color: #871B1B; text-decoration: none; font-weight: 600; }
        .pd-commit-text a:hover { text-decoration: underline; }

        /* ════════════════════
           SECTION CARDS (left bottom)
        ════════════════════ */
        .pd-section-card {
          border: 1.5px solid #e9ecef; border-radius: 10px;
          padding: 22px 24px; margin-top: 16px;
        }
        .pd-section-card h3 { font-size: 17px; font-weight: 700; color: #212529; margin-bottom: 14px; }
        .pd-detail-sku { font-size: 13px; color: #6c757d; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
        .pd-detail-title { font-size: 15px; font-weight: 700; color: #212529; margin-bottom: 10px; }
        .pd-detail-label { font-size: 13px; font-weight: 700; color: #212529; margin-bottom: 6px; text-transform: uppercase; }
        .pd-detail-lines p { font-size: 14px; color: #444; margin-bottom: 8px; line-height: 1.6; }
        .pd-detail-blur { position: relative; overflow: hidden; }
        .pd-detail-blur::after {
          content: ""; position: absolute; bottom: 0; left: 0; right: 0;
          height: 60px; background: linear-gradient(transparent, #fff); pointer-events: none;
        }
        .pd-showmore-btn {
          background: #fff; border: 1.5px solid #212529; border-radius: 50px;
          padding: 6px 20px; font-size: 13.5px; font-weight: 700;
          font-family: 'Manrope', sans-serif; color: #212529;
          cursor: pointer; margin-top: 10px; transition: background 0.15s;
          display: block;
        }
        .pd-showmore-btn:hover { background: #f8f9fa; }

        .pd-wishlist, .pd-zoom { display: flex; align-items: center; justify-content: center; background: #fff; color: #871B1B; border: 1px solid #e5cccc; border-radius: 50%; width: 48px; height: 48px; flex-shrink: 0; font-size: 20px; }
        .pd-wishlist:hover, .pd-wishlist.active { background: #fcf2f2; border-color: #871B1B; }
        .pd-zoom { position: absolute; top: 14px; right: 14px; width: 40px; height: 40px; background: rgba(252, 242, 242, 0.5); border: 0; }
        .pd-image-modal { position: fixed; inset: 0; margin: auto; border: none; border-radius: 14px; padding: 0; width: min(900px, 94vw); max-height: 90vh; max-height: 90dvh; overflow: auto; background: #fff; color: #212529; box-shadow: 0 16px 60px #0003; }
        .pd-image-modal::backdrop { background: rgba(20, 12, 12, 0.7); }
        .pd-modal-content { padding: 20px; }
        .pd-modal-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; }
        .pd-modal-head h2 { font-size: 18px; margin: 0; }
        .pd-modal-head button { border: none; background: #fcf2f2; color: #871B1B; border-radius: 50%; width: 40px; height: 40px; flex-shrink: 0; }
        .pd-modal-content > img { display: block; width: 100%; height: auto; }
        .pd-image-modal-fullscreen { width: 100vw; max-width: 100vw; height: 100vh; height: 100dvh; max-height: 100vh; max-height: 100dvh; border-radius: 0; overflow: hidden; background: #111; color: #fff; }
        .pd-image-modal-fullscreen .pd-modal-content { display: flex; flex-direction: column; height: 100%; padding: 16px; }
        .pd-image-modal-fullscreen .pd-modal-head { flex-shrink: 0; margin-bottom: 12px; }
        .pd-image-modal-fullscreen .pd-modal-head h2 { font-size: 16px; }
        .pd-image-modal-fullscreen .pd-modal-head button { background: #ffffff1f; color: #fff; }
        .pd-image-modal-fullscreen .pd-modal-content > img { flex: 1; min-height: 0; height: 0; object-fit: contain; }

        /* FAQ */
        .pd-faq-head {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 15px; font-weight: 700; color: #212529; margin-bottom: 6px;
        }
        .pd-faq-head i { font-size: 16px; color: #6c757d; }
        .pd-faq-item { border-bottom: 1px solid #f0f0f0; padding: 14px 0; }
        .pd-faq-item:last-child { border-bottom: none; }
        .pd-faq-q {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          width: 100%; text-align: left; padding: 0; border: 0; background: none; cursor: pointer; font-size: 14.5px; font-weight: 600; color: #212529;
        }
        .pd-faq-q i { font-size: 15px; flex-shrink: 0; color: #6c757d; }
        .pd-faq-a { margin-top: 10px; font-size: 14px; color: #555; line-height: 1.65; padding-right: 8px; }

        /* ════════════════════
           RESPONSIVE
        ════════════════════ */
        @media (max-width: 1520px) {
          .pd-breadcrumb { padding: 0 24px; }
          .pd-page { padding: 24px 24px 56px; }
        }
        @media (max-width: 1000px) {
          .pd-layout { flex-direction: column; }
          .pd-left { flex: unset; max-width: 100%; width: 100%; }
          .pd-right { width: 100%; position: static; max-height: none; overflow-y: visible; }
        }
        @media (max-width: 640px) {
          .pd-commit-grid { grid-template-columns: 1fr; }
          .pd-gallery { flex-direction: column-reverse; }
          .pd-main-img-wrap { flex: auto; }
          .pd-thumbs { flex-direction: row; flex: unset; overflow-x: auto; }
          .pd-action-row { flex-wrap: wrap; gap: 8px; }
          .pd-qty { height: 44px; }
          .pd-qty-btn { width: 30px; }
          .pd-btn-cart { font-size: 13px; min-width: 145px; }
          .pd-thumb  { width: 70px; height: 90px; }
        }
      `}</style>

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

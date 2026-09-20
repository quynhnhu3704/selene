// frontend\src\pages\ProductDetail.jsx
import Loading from "../../components/common/Loading";
import { useState, useEffect, useLayoutEffect, useContext } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { getProductById } from "../../services/product.service";
import { CartContext } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { FAQS, COMMITS, SIZE_GUIDE_IMAGE, getColorImage } from "./constants";
import ImageModal from "./ImageModal";
import { toast } from "react-toastify";

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
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    let active = true;
    const fetchProduct = async () => {
      try {
        const res = await getProductById(id);

        console.log(res.data);

        if (active) setProduct(res.data);
      } catch (err) {
        if (active) setProduct(null);
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProduct();
    return () => { active = false; };
  }, [id]);

  const copySku = () => {
    navigator.clipboard?.writeText(product?.product_id || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "60vh" }}
      >
        <Loading text="Đang tải sản phẩm..." />
      </div>
    );
  }

  if (!product) {
    return <div style={{ padding: 40 }}>Không tìm thấy sản phẩm</div>;
  }

  const PRODUCT = {
    ...product,

    name: product.product_name,
    price: product.discount_price,
    originalPrice: product.original_price,
    sku: product.product_id,

    images: (Array.isArray(product.images) ? product.images : []).filter(
      (src) => typeof src === "string" && src.trim() && !failedImages.includes(src),
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
    setFailedImages((previous) => previous.includes(src) ? previous : [...previous, src]);
  };
  const selectedColor = PRODUCT.colors[activeColor]?.label;
  const selectedSize = PRODUCT.sizes[activeSize];

  const selectedVariant = (product.variants || []).find(
    (v) => v.color === selectedColor && v.size === selectedSize,
  );

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
          { label: "Sản phẩm", path: "/san-pham" },
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

        /* sale banner */
        .pd-sale-banner {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: #871B1B; padding: 10px 20px;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .pd-sale-banner span { font-size: 16px; font-weight: 700; color: #fff; text-transform: uppercase; }
        .pd-sale-banner .pd-sale-badge {
          background: #fff; color: #871B1B;
          font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px; letter-spacing: 1px;
        }

        /* arrows */
        .pd-arrow {
          position: absolute; top: 50%; transform: translateY(-50%);
          background: #fff; border: 1px solid #ddd; border-radius: 50%;
          width: 42px; height: 42px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 15px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.12); color: #333;
          transition: box-shadow 0.15s;
        }
        .pd-arrow:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .pd-arrow.prev { left: 12px; }
        .pd-arrow.next { right: 12px; }
        .pd-arrow:disabled { opacity: 0.35; cursor: default; }

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
        .pd-guide-link { background: none; border: none; padding: 0; font-size: 13.5px; font-weight: 600; color: #871B1B; text-decoration: none; }
        .pd-guide-link:hover { text-decoration: underline; }
        .pd-sizes { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 22px; }
        .pd-size-btn {
          min-width: 72px; height: 40px; border-radius: 8px;
          border: 1.5px solid #d0d0d0; background: #fff;
          font-size: 14px; font-weight: 600; font-family: 'Manrope', sans-serif;
          color: #333; cursor: pointer; padding: 0 10px; transition: all 0.15s;
        }
        .pd-size-btn.active { border-color: #871B1B; background: #fcf2f2; color: #871B1B; }
        .pd-size-btn:hover:not(.active) { border-color: #6c757d; }

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
        .pd-zoom { position: absolute; top: 14px; right: 14px; width: 40px; height: 40px; box-shadow: 0 2px 12px #0001; }
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
          .pd-sale-banner { padding: 10px; gap: 6px; }
          .pd-sale-banner span { font-size: 11px; }
          .pd-thumb  { width: 70px; height: 90px; }
        }
      `}</style>

      {modal && (modal === "size" || PRODUCT.images.length > 0) && (
        <ImageModal title={modal === "size" ? "Hướng dẫn chọn size" : PRODUCT.name}
          fullscreen={modal === "zoom"}
          src={modal === "size" ? SIZE_GUIDE_IMAGE : PRODUCT.images[activeImg]}
          alt={modal === "size" ? "Bảng kích thước tham khảo" : PRODUCT.name}
          onError={modal === "zoom" ? () => hideFailedImage(PRODUCT.images[activeImg]) : undefined}
          note={modal === "size" ? "Bảng size tham khảo. Liên hệ tư vấn để chọn kích thước phù hợp với sản phẩm." : undefined}
          onClose={() => setModal(null)} />
      )}
      <div className="pd-page">
        <div className="pd-layout">
          {/* ════════════ CỘT TRÁI ════════════ */}
          <div className="pd-left">
            {/* GALLERY */}
            {PRODUCT.images.length > 0 && <div className="pd-gallery">
              <div className="pd-thumbs">
                {PRODUCT.images.map((img, i) => (
                  <img
                    key={img}
                    src={img}
                    alt={`Ảnh ${i + 1}`}
                    className={`pd-thumb${activeImg === i ? " active" : ""}`}
                    onClick={() => setSelectedImage(img)}
                    onError={() => hideFailedImage(img)}
                  />
                ))}
              </div>

              <div className="pd-main-img-wrap">
                <img
                  key={PRODUCT.images[activeImg]}
                  src={PRODUCT.images[activeImg]}
                  onError={() => hideFailedImage(PRODUCT.images[activeImg])}
                  alt={PRODUCT.name}
                  className="pd-main-img"
                />

                <button
                  className="pd-arrow prev"
                  aria-label="Ảnh trước"
                  disabled={PRODUCT.images.length < 2}
                  onClick={() =>
                    setSelectedImage(
                      PRODUCT.images[(activeImg - 1 + PRODUCT.images.length) % PRODUCT.images.length],
                    )
                  }
                >
                  <i className="bi bi-chevron-left" />
                </button>
                <button
                  className="pd-arrow next"
                  aria-label="Ảnh tiếp theo"
                  disabled={PRODUCT.images.length < 2}
                  onClick={() =>
                    setSelectedImage(PRODUCT.images[(activeImg + 1) % PRODUCT.images.length])
                  }
                >
                  <i className="bi bi-chevron-right" />
                </button>

                <button type="button" className="pd-zoom" onClick={() => setModal("zoom")} aria-label="Phóng to ảnh sản phẩm"><i className="bi bi-zoom-in" /></button>
                <div className="pd-sale-banner">
                  <i className="bi bi-tag text-white" />
                  <span>Giá độc quyền website</span>
                  <span className="pd-sale-badge">SALE</span>
                </div>
              </div>
            </div>}

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
                  <img
                    className="pd-color-swatch"
                    src={c.image}
                    alt={c.label}
                  />
                </button>
              ))}
            </div>

            {/* Kích thước */}
            <div className="pd-size-row">
              <div className="pd-section-label mb-0">
                Kích thước: <strong>{PRODUCT.sizes[activeSize]}</strong>
              </div>
              <button type="button" className="pd-guide-link" onClick={() => setModal("size")}>
                Hướng dẫn chọn size
              </button>
            </div>
            <div className="pd-sizes">
              {PRODUCT.sizes.map((sz, i) => (
                <button
                  key={i}
                  className={`pd-size-btn${activeSize === i ? " active" : ""}`}
                  onClick={() => setSize(i)}
                  aria-pressed={activeSize === i}
                >
                  {sz}
                </button>
              ))}
            </div>

            {/* Qty + Thêm vào giỏ */}
            <div className="pd-action-row">
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
                onClick={async () => {
                  if (!selectedVariant) {
                    toast.error(
                      "Sản phẩm với màu và kích thước này không có hàng.",
                    );
                    return;
                  }

                  if (Number(selectedVariant.stock_quantity || 0) <= 0) {
                    toast.error(
                      "Sản phẩm với màu và kích thước đã chọn đã hết hàng.",
                    );
                    return;
                  }
                  if (qty > Number(selectedVariant.stock_quantity)) {
                    toast.error(
                      `Chỉ còn ${selectedVariant.stock_quantity} sản phẩm với màu và kích thước đã chọn.`,
                    );
                    return;
                  }

                  try {
                    await addToCart(
                      product.product_id,
                      selectedVariant.variant_id,
                      qty,
                    );

                    toast.success("Đã thêm sản phẩm vào giỏ hàng!");
                  } catch (error) {
                    toast.error(
                      error.response?.data?.message ||
                        "Không thể thêm vào giỏ hàng. Vui lòng thử lại.",
                    );
                    console.error(
                      "Lỗi thêm giỏ hàng:",
                      error.response?.data || error,
                    );
                  }
                }}
              >
                Thêm vào giỏ&nbsp;
                <i className="bi bi-handbag" />
              </button>
              <button type="button" className={`pd-wishlist${isFavorite(product.product_id) ? " active" : ""}`}
                onClick={() => toggleWishlist(product)} aria-pressed={isFavorite(product.product_id)}
                aria-label={isFavorite(product.product_id) ? "Bỏ yêu thích" : "Thêm vào yêu thích"}>
                <i className={`bi ${isFavorite(product.product_id) ? "bi-heart-fill" : "bi-heart"}`} />
              </button>
            </div>

            {/* Cam kết */}
            <div className="pd-commit-title">
              <span>SELENE cam kết</span>
              <i className="bi bi-patch-check" style={{ color: "#871B1B", fontSize: 20 }} />
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

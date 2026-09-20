import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { useWishlist } from "../../context/WishlistContext";
import defaultImage from "../../assets/images/default-product.png";

function fmt(price) {
  return Number(price || 0).toLocaleString("vi-VN") + "đ";
}

export default function Wishlist() {
  const { wishlist, toggleWishlist } = useWishlist();

  return (
    <>
      <Helmet><title>Sản phẩm yêu thích | Selene</title></Helmet>
      <div className="wl-breadcrumb"><Breadcrumb items={[{ label: "Trang chủ", path: "/" }, { label: "Yêu thích" }]} /></div>
      <style>{`
        .wl-breadcrumb { padding: 0 75px; }
        .wl-breadcrumb > .container { width: 100%; max-width: none; margin: 0 !important; }
        .wl-page { padding: 28px 75px 64px; min-height: 60vh; }
        .wl-heading { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #871B1B; }
        .wl-heading span { font-size: 15px; color: #777; font-weight: 400; }
        .wl-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 28px 20px; }
        .wl-image { position: relative; background: #f5f5f5; overflow: hidden; }
        .wl-image img { display: block; width: 100%; aspect-ratio: 3/4; object-fit: cover; object-position: top; }
        .wl-remove { position: absolute; top: 12px; right: 12px; border: 1px solid #eadada; background: #fff; color: #871B1B; border-radius: 50%; width: 40px; height: 40px; }
        .wl-remove:hover { background: #fcf2f2; }
        .wl-name { display: block; color: #222; font-size: 14px; font-weight: 600; text-decoration: none; margin: 12px 0 8px; }
        .wl-name:hover { color: #871B1B; }
        .wl-price { color: #871B1B; font-weight: 700; margin-right: 10px; }
        .wl-empty { padding: 64px 16px; text-align: center; }
        .wl-empty > i { font-size: 48px; color: #871B1B; }
        .wl-empty h2 { font-size: 20px; margin: 20px 0 12px; }
        .wl-shop { display: inline-block; padding: 12px 24px; border-radius: 6px; background: #871B1B; color: #fff; text-decoration: none; }
        .wl-shop:hover { background: #6f1515; }
        @media (max-width: 1520px) { .wl-breadcrumb { padding: 0 24px; } .wl-page { padding: 24px 24px 56px; } }
        @media (max-width: 900px) { .wl-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 480px) { .wl-page { padding: 24px 16px; } .wl-grid { gap: 24px 12px; } }
      `}</style>
      <div className="wl-page">
        <h1 className="wl-heading">Sản phẩm yêu thích <span>({wishlist.length} sản phẩm)</span></h1>
        {wishlist.length === 0 ? (
          <div className="wl-empty">
            <i className="bi bi-heart" />
            <h2>Bạn chưa có sản phẩm yêu thích</h2>
            <p className="text-muted">Bấm biểu tượng trái tim để lưu những sản phẩm bạn thích.</p>
            <Link to="/san-pham" className="wl-shop">Khám phá sản phẩm</Link>
          </div>
        ) : (
          <div className="wl-grid">
            {wishlist.map((product) => (
              <div key={product.product_id}>
                <div className="wl-image">
                  <Link to={"/san-pham/" + product.product_id}>
                    <img src={product.image_url || defaultImage} alt={product.product_name} loading="lazy"
                      onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = defaultImage; }} />
                  </Link>
                  <button type="button" className="wl-remove" onClick={() => toggleWishlist(product)} aria-label={"Bỏ yêu thích " + product.product_name}>
                    <i className="bi bi-heart-fill" />
                  </button>
                </div>
                <Link to={"/san-pham/" + product.product_id} className="wl-name">{product.product_name}</Link>
                <span className="wl-price">{fmt(product.discount_price ?? product.original_price)}</span>
                {product.original_price > product.discount_price && <del className="text-muted small">{fmt(product.original_price)}</del>}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

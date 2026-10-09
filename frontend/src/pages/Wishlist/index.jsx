import ProductCard from "../../components/common/ProductCard";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { useWishlist } from "../../context/WishlistContext";

export default function Wishlist() {
  const { wishlist } = useWishlist();

  return (
    <>
      <Helmet>
        <title>Sản phẩm yêu thích | Selene</title>
      </Helmet>

      <Breadcrumb
        items={[{ label: "Trang chủ", path: "/" }, { label: "Yêu thích" }]}
      />

      <style>{`
        .wl-page { padding: 28px 75px 64px; min-height: 60vh; }
        .wl-heading { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #871B1B; }
        .wl-heading span { font-size: 15px; color: #777; font-weight: 400; }
        .wl-empty { padding: 64px 16px; text-align: center; }
        .wl-empty > i { font-size: 48px; color: #871B1B; }
        .wl-empty h2 { font-size: 20px; margin: 20px 0 12px; }
        .wl-shop { display: inline-block; padding: 12px 24px; border-radius: 6px; background: #871B1B; color: #fff; text-decoration: none; }
        .wl-shop:hover { background: #6f1515; }
        @media (max-width: 1520px) { .wl-page { padding: 24px 24px 56px; } }
        @media (max-width: 480px) { .wl-page { padding: 24px 16px; } }
      `}</style>
      <div className="wl-page">
        <h1 className="wl-heading">
          Sản phẩm yêu thích <span>({wishlist.length} sản phẩm)</span>
        </h1>
        {wishlist.length === 0 ? (
          <div className="wl-empty">
            <i className="bi bi-heart" />
            <h2>Bạn chưa có sản phẩm yêu thích</h2>
            <p className="text-muted">
              Bấm biểu tượng trái tim để lưu những sản phẩm bạn thích.
            </p>
            <Link to="/san-pham" className="wl-shop">
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <div className="pl-grid">
            {wishlist.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

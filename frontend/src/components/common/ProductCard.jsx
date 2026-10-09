import ProductLink from "./ProductLink";
import ProductImage from "./ProductImage";
import { useWishlist } from "../../context/WishlistContext";

function fmt(price) {
  return Number(price || 0).toLocaleString("vi-VN") + "đ";
}

export default function ProductCard({ product }) {
  const { isFavorite, toggleWishlist } = useWishlist();

  return (
    <div className="pl-pcard">
      <div className="pl-pimg-wrap">
        <ProductLink productId={product.product_id}>
          <ProductImage
            src={product.image_url}
            alt=""
            loading="lazy"
          />
          {product.second_image_url && (
            <img
              key={product.second_image_url}
              className="pl-pimg-secondary"
              src={product.second_image_url}
              alt=""
              aria-hidden="true"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}
        </ProductLink>
        <button
          type="button"
          className={`pl-favorite${isFavorite(product.product_id) ? " active" : ""}`}
          onClick={() => toggleWishlist(product)}
          aria-pressed={isFavorite(product.product_id)}
          aria-label={
            isFavorite(product.product_id)
              ? "Bỏ yêu thích " + product.product_name
              : "Yêu thích " + product.product_name
          }
        >
          <i
            className={`bi ${isFavorite(product.product_id) ? "bi-suit-heart-fill" : "bi-suit-heart"}`}
          />
        </button>
      </div>

      <div className="pl-pinfo">
        <ProductLink
          className="pl-pname"
          productId={product.product_id}
        >
          {product.product_name}
        </ProductLink>

        <div className="pl-price-row">
          <span className="pl-price-current">
            {fmt(product.discount_price)}
          </span>

          <span className="pl-price-original">
            {fmt(product.original_price)}
          </span>
        </div>
      </div>
    </div>
  );
}

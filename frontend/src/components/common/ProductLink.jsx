import { Link, useLocation } from "react-router-dom";
import { prefetchProduct } from "../../services/product.service";

export default function ProductLink({
  productId,
  onPointerEnter,
  onFocus,
  onTouchStart,
  state,
  ...props
}) {
  const { pathname } = useLocation();
  const preload = () => prefetchProduct(productId);
  return (
    <Link
      {...props}
      state={{ ...state, from: pathname }}
      to={`/san-pham/${encodeURIComponent(productId)}`}
      onPointerEnter={(event) => {
        preload();
        onPointerEnter?.(event);
      }}
      onFocus={(event) => {
        preload();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        preload();
        onTouchStart?.(event);
      }}
    />
  );
}

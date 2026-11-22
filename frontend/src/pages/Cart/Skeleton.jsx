export function CartItemsSkeleton() {
  return (
    <div role="status" aria-label="Đang tải giỏ hàng" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <div className="cart-item" key={item} aria-hidden="true">
          <div className="cart-placeholder cart-item-check cart-skeleton-check" />
          <div className="cart-placeholder cart-item-img-wrap" />
          <div className="cart-item-info">
            <div className="cart-placeholder cart-skeleton-name" />
            <div className="cart-placeholder cart-skeleton-detail" />
            <div className="cart-item-options">
              <div className="cart-placeholder cart-skeleton-option" />
              <div className="cart-placeholder cart-skeleton-option" />
            </div>
          </div>
          <div className="cart-item-price">
            <div className="cart-placeholder cart-skeleton-line" />
          </div>
          <div className="cart-placeholder cart-qty cart-skeleton-quantity" />
          <div className="cart-item-subtotal">
            <div className="cart-placeholder cart-skeleton-line" />
          </div>
          <div className="cart-del-btn">
            <div className="cart-placeholder cart-skeleton-check" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CartSummarySkeleton() {
  return (
    <div role="status" aria-label="Đang tải tóm tắt đơn hàng" aria-busy="true">
      <div aria-hidden="true">
        {[0, 1].map((row) => (
          <div className="cart-summary-row" key={row}>
            <div className="cart-placeholder cart-skeleton-label" />
            <div className="cart-placeholder cart-skeleton-line" />
          </div>
        ))}
        <hr className="cart-summary-divider" />
        <div className="cart-summary-total">
          <div className="cart-placeholder cart-skeleton-label" />
          <div className="cart-placeholder cart-skeleton-total" />
        </div>
        <div className="cart-placeholder cart-skeleton-action" />
        <div className="cart-placeholder cart-skeleton-secure" />
        <div className="d-flex justify-content-center gap-2 mt-3">
          {[0, 1, 2, 3].map((icon) => (
            <div className="cart-placeholder cart-skeleton-option" key={icon} />
          ))}
        </div>
      </div>
    </div>
  );
}

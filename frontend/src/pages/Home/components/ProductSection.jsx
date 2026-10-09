// frontend\src\pages\Home\components\ProductSection.jsx
import ProductImage from "../../../components/common/ProductImage";
import ProductLink from "../../../components/common/ProductLink";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

function fmt(n) {
  return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

export default function ProductSection({
  title,
  products = [],
  loading = false,
}) {
  const sliderRef = useRef(null);

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const image = slider.querySelector(".pl-pimg-wrap");
    const updateScroll = () => {
      if (image) {
        slider.parentElement.style.setProperty(
          "--slider-image-center",
          `${image.offsetHeight / 2}px`,
        );
      }
      setCanScrollPrev(slider.scrollLeft > 1);
      setCanScrollNext(
        slider.scrollLeft + slider.clientWidth < slider.scrollWidth - 1,
      );
    };
    updateScroll();
    const observer = new ResizeObserver(updateScroll);
    observer.observe(slider);
    if (image) observer.observe(image);
    slider.addEventListener("scroll", updateScroll);
    return () => {
      observer.disconnect();
      slider.removeEventListener("scroll", updateScroll);
    };
  }, [products, loading]);

  const scroll = (direction) => {
    if (!sliderRef.current) return;

    sliderRef.current.scrollBy({
      left: direction === "next" ? 360 : -360,
      behavior: "smooth",
    });
  };

  return (
    <section className="pl-home-products">
      <div className="pl-home-title-row">
        <div className="pl-home-title">
          <h2>{title}</h2>

          <div className="rb-divider">
            <div className="gl" />
            <div className="gd" />
            <div className="gl" />
          </div>
        </div>
        <Link className="pl-home-view-all" to="/san-pham">
          Xem tất cả <span aria-hidden="true">→</span>
        </Link>
      </div>

      {loading ? (
        <div role="status" aria-label={`Đang tải ${title.toLowerCase()}...`}>
          <div className="pl-home-slider home-skeleton-row" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="pl-home-product-item" key={index}>
                <div className="pl-pimg-wrap pl-skeleton home-product-skeleton-image" />
                <div className="pl-pinfo">
                  <div className="pl-skeleton home-product-skeleton-name" />
                  <div className="pl-skeleton home-product-skeleton-price" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="pl-home-state">Chưa có sản phẩm.</div>
      ) : (
        <div className="pl-home-slider-wrap">
          <div className="pl-home-slider" ref={sliderRef}>
            {products.map((product) => (
              <div className="pl-home-product-item" key={product.product_id}>
                <div className="pl-pcard">
                  <div className="pl-pimg-wrap">
                    <ProductLink productId={product.product_id}>
                      <ProductImage src={product.image_url} alt="" loading="lazy" />
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

                      {Number(product.original_price) >
                        Number(product.discount_price) && (
                        <span className="pl-price-original">
                          {fmt(product.original_price)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {(canScrollPrev || canScrollNext) && (
            <>
              <button
                type="button"
                className="slider-arrow pl-home-arrow prev"
                onClick={() => scroll("prev")}
                disabled={!canScrollPrev}
                aria-label="Xem sản phẩm trước"
              >
                <i className="bi bi-caret-left" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="slider-arrow pl-home-arrow next"
                onClick={() => scroll("next")}
                disabled={!canScrollNext}
                aria-label="Xem thêm sản phẩm"
              >
                <i className="bi bi-caret-right" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}

    </section>
  );
}

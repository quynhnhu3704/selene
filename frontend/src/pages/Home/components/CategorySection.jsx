// frontend\src\pages\Home\components\CategorySection.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import defaultImage from "../../../assets/images/default-product.png";

export default function CategorySection({ categories = [], loading = false }) {
  const allCategories = categories.flatMap(function flatten(category) {
    return [category, ...(category.children || []).flatMap(flatten)];
  });
  const sliderRef = useRef(null);

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const image = slider.querySelector(".home-category-card img");
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
  }, [categories, loading]);

  const scroll = (direction) => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({
      left: (direction === "next" ? 1 : -1) * sliderRef.current.clientWidth,
      behavior: "smooth",
    });
  };

  return (
    <section className="home-categories">
      <div className="home-category-title">
        <h2>Danh Mục Sản Phẩm</h2>

        <div className="rb-divider">
          <div className="gl" />
          <div className="gd" />
          <div className="gl" />
        </div>
      </div>

      {loading ? (
        <div role="status" aria-label="Đang tải danh mục...">
          <div className="home-category-grid home-skeleton-row" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                className="home-category-card pl-skeleton home-category-skeleton"
                key={index}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="home-category-slider-wrap">
          <div className="home-category-grid" ref={sliderRef}>
            {allCategories.map((category) => (
              <Link
                key={category.category_id}
                to={`/san-pham?category=${encodeURIComponent(
                  category.category_id,
                )}`}
                className="home-category-card"
              >
                <img
                  src={category.image_url || defaultImage}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultImage;
                  }}
                />

                <div className="home-category-overlay">
                  <span>{category.name}</span>
                </div>
              </Link>
            ))}
          </div>
          {(canScrollPrev || canScrollNext) && (
            <>
              <button
                type="button"
                className="slider-arrow home-category-arrow prev"
                onClick={() => scroll("prev")}
                disabled={!canScrollPrev}
                aria-label="Xem danh mục trước"
              >
                <i className="bi bi-caret-left" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="slider-arrow home-category-arrow next"
                onClick={() => scroll("next")}
                disabled={!canScrollNext}
                aria-label="Xem thêm danh mục"
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

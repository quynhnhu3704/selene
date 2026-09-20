// frontend\src\pages\Home\components\CategorySection.jsx
import Loading from "../../../components/common/Loading";
import { Link } from "react-router-dom";

import defaultImage from "../../../assets/images/default-product.png";

export default function CategorySection({ categories = [], loading = false }) {
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
        <div className="home-category-state"><Loading text="Đang tải danh mục..." /></div>
      ) : (
        <div className="home-category-grid">
          {categories.map((category) => (
            <Link
              key={category.category_id}
              to={`/san-pham?category=${encodeURIComponent(
                category.category_id,
              )}`}
              className="home-category-card"
            >
              <img
                src={category.image_url || defaultImage}
                alt={category.name}
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
      )}
    </section>
  );
}

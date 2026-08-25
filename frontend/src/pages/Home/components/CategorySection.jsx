// frontend\src\pages\Home\components\CategorySection.jsx
import { Link } from "react-router-dom";

import aoImage from "../../../assets/categories/ao.jpg";
import chanVayImage from "../../../assets/categories/chan-vay.jpg";
import damImage from "../../../assets/categories/dam.jpg";
import quanImage from "../../../assets/categories/quan.jpg";
import setBoImage from "../../../assets/categories/set-bo.jpg";

const CATEGORY_CONFIG = [
  {
    name: "Áo",
    image: aoImage,
  },
  {
    name: "Chân váy",
    image: chanVayImage,
  },
  {
    name: "Đầm",
    image: damImage,
  },
  {
    name: "Quần",
    image: quanImage,
  },
  {
    name: "Set bộ",
    image: setBoImage,
  },
];

export default function CategorySection({ categories = [], loading = false }) {
  const displayCategories = CATEGORY_CONFIG.map((config) => {
    const category = categories.find(
      (item) =>
        String(item.name || "")
          .trim()
          .toLowerCase() === config.name.toLowerCase(),
    );

    return category
      ? {
          ...config,
          category_id: category.category_id,
        }
      : null;
  }).filter(Boolean);

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
        <div className="home-category-state">Đang tải danh mục...</div>
      ) : (
        <div className="home-category-grid">
          {displayCategories.map((category) => (
            <Link
              key={category.category_id}
              to={`/san-pham?category=${encodeURIComponent(
                category.category_id,
              )}`}
              className="home-category-card"
            >
              <img src={category.image} alt={category.name} loading="lazy" />

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

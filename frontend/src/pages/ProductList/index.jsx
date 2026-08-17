// frontend\src\pages\ProductList.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../services/product.service";

function fmt(n) {
  return n.toLocaleString("vi-VN") + "vnđ";
}

const SORT_OPTIONS = [
  { value: "default", label: "Mặc định" },
  { value: "az", label: "A → Z" },
  { value: "za", label: "Z → A" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
];

const CATEGORIES = [
  { label: "Áo Nữ", children: ["Áo Thun", "Áo Sơ Mi", "Áo Kiểu"] },
  { label: "Áo Khoác Nữ" },
  { label: "Quần Nữ", children: ["Quần Jeans", "Quần Kaki", "Quần Short"] },
  { label: "Váy" },
  { label: "Đầm" },
  { label: "Set Đồ Nữ" },
  { label: "Phụ Kiện" },
  { label: "Jumpsuit" },
  { label: "Đồ Bộ Nữ" },
];

/* ── PAGINATION ── */
function Pagination({ page, total, onChange }) {
  const pages = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", total);
    } else if (page >= total - 3) {
      pages.push(1, "...", total - 4, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, "...", page - 1, page, page + 1, "...", total);
    }
  }

  return (
    <div className="pl-pagination">
      {pages.map((p, idx) =>
        p === "..." ? (
          <button
            key={`ellipsis-${idx}`}
            className="pl-pg-btn pl-pg-ellipsis"
            disabled
          >
            ...
          </button>
        ) : (
          <button
            key={p}
            className={`pl-pg-btn${p === page ? " active" : ""}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        className="pl-pg-btn pl-pg-next"
        onClick={() => onChange(Math.min(page + 1, total))}
        disabled={page === total}
      >
        »
      </button>
    </div>
  );
}

/* ── MAIN COMPONENT ── */
export default function ProductList() {
  const [openCats, setOpenCats] = useState({});
  const [showAllCats, setShowAll] = useState(false);
  const visibleCategories = showAllCats ? CATEGORIES : CATEGORIES.slice(0, 5);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortVal, setSortVal] = useState("default");
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 12,
  });

  /* filter / sort */
  const [checkedBrand, setCheckedBrand] = useState([]);
  const [checkedPrice, setCheckedPrice] = useState([]);
  const [checkedLocation, setCheckedLocation] = useState([]);

  const toggleCat = (label) =>
    setOpenCats((prev) => ({ ...prev, [label]: !prev[label] }));

  const toggleCheck = (setter, val) =>
    setter((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );

  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sortVal)?.label ?? "Mặc định";

  /* sort products (demo) */
  let displayed = [...products];

  if (sortVal === "az")
    displayed.sort((a, b) => a.product_name.localeCompare(b.product_name));

  if (sortVal === "za")
    displayed.sort((a, b) => b.product_name.localeCompare(a.product_name));

  if (sortVal === "price_asc")
    displayed.sort((a, b) => a.discount_price - b.discount_price);

  if (sortVal === "price_desc")
    displayed.sort((a, b) => b.discount_price - a.discount_price);

  const handleSort = (val) => {
    setSortVal(val);
    setSortOpen(false);
    setPage(1);
  };
  const handlePage = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        const res = await getProducts(page);

        setProducts(res.data);
        setPagination(res.pagination);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [page]);

  return (
    <>
      <style>{`
        /* ── BREADCRUMB WRAP ── */
        .pl-breadcrumb-wrap {
          padding: 13px 75px;
          background: #fff;
          border-bottom: 1px solid #f0f0f0;
        }

        /* ── LAYOUT ── */
        .pl-layout {
          display: flex;
          align-items: flex-start;
          gap: 0;
          padding: 0 75px 60px;
          background: #fff;
          min-height: 80vh;
        }

        /* ════════════
           SIDEBAR
        ════════════ */
        .pl-sidebar {
          flex: 0 0 290px;
          width: 290px;
          padding: 28px 0 0;
          border-right: 1px solid #ebebeb;
          min-height: 100%;
        }

        .pl-sidebar-section { margin-bottom: 28px; }

        .pl-sidebar-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          color: #111;
          margin-bottom: 12px;
        }

        /* "Xem tất cả danh mục" dropdown */
        .pl-cat-all-btn {
          background: none;
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 13px;
          font-family: 'Montserrat', sans-serif;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
        }
        .pl-cat-all-btn:hover { border-color: #871B1B; color: #871B1B; }

        /* Danh mục list */
        .pl-cat-list { list-style: none; padding: 0; margin: 0; }
        .pl-cat-item { border-bottom: 1px solid #f2f2f2; }
        .pl-cat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 9px 4px 9px 0;
          font-size: 13.5px;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          text-decoration: none;
        }
        .pl-cat-row:hover { color: #871B1B; }
        .pl-cat-toggle {
          background: none;
          border: 1px solid #ccc;
          border-radius: 3px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #666;
          font-size: 14px;
          line-height: 1;
          flex-shrink: 0;
        }
        .pl-cat-toggle:hover { border-color: #871B1B; color: #871B1B; }

        /* Sub-categories */
        .pl-subcat-list {
          list-style: none;
          padding: 0 0 6px 14px;
          margin: 0;
        }
        .pl-subcat-list li a {
          display: block;
          padding: 5px 0;
          font-size: 13px;
          color: #555;
          text-decoration: none;
        }
        .pl-subcat-list li a:hover { color: #871B1B; }

        /* Sidebar scrollbar strip */
        .pl-sidebar-scroll {
          max-height: 420px;
          overflow-y: auto;
          padding-right: 4px;
          scrollbar-width: thin;
          scrollbar-color: #222 #f0f0f0;
          border-left: 3px solid transparent;
        }
        .pl-sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .pl-sidebar-scroll::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        .pl-sidebar-scroll::-webkit-scrollbar-track { background: #f0f0f0; }

        /* Checkbox filter */
        .pl-check-list { list-style: none; padding: 0; margin: 0; }
        .pl-check-list li {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 5px 0;
          font-size: 13.5px;
          color: #333;
          cursor: pointer;
        }
        .pl-check-list li input[type="checkbox"] {
          width: 15px; height: 15px;
          accent-color: #871B1B;
          cursor: pointer;
          flex-shrink: 0;
        }
        .pl-check-list li:hover { color: #871B1B; }

        /* Price filter scrollbar strip */
        .pl-price-scroll {
          max-height: 180px;
          overflow-y: auto;
          padding-right: 4px;
          scrollbar-width: thin;
          scrollbar-color: #222 #f0f0f0;
        }
        .pl-price-scroll::-webkit-scrollbar { width: 3px; }
        .pl-price-scroll::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }

        /* Size */
        .pl-size-wrap { display: flex; flex-wrap: wrap; gap: 7px; }
        .pl-size-btn {
          border: 1px solid #ccc;
          background: #fff;
          border-radius: 4px;
          padding: 5px 12px;
          font-size: 12.5px;
          font-family: 'Montserrat', sans-serif;
          color: #333;
          cursor: pointer;
        }
        .pl-size-btn:hover,
        .pl-size-btn.active { border-color: #222; background: #222; color: #fff; }

        /* ════════════
           MAIN CONTENT
        ════════════ */
        .pl-main {
          flex: 1 1 0;
          min-width: 0;
          padding: 28px 0 0 36px;
        }

        /* TOP ROW: title + sort */
        .pl-main-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .pl-main-heading {
          font-size: 18px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #111;
        }

        /* Sort dropdown */
        .pl-sort-wrap { position: relative; }
        .pl-sort-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          font-size: 13.5px;
          font-family: 'Montserrat', sans-serif;
          color: #333;
          cursor: pointer;
          padding: 0;
        }
        .pl-sort-btn i { font-size: 15px; color: #555; }
        .pl-sort-btn strong { color: #111; font-weight: 700; }
        .pl-sort-btn .bi-chevron-down { font-size: 12px; }

        .pl-sort-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.12);
          z-index: 100;
          min-width: 170px;
          overflow: hidden;
        }
        .pl-sort-option {
          display: block;
          width: 100%;
          padding: 10px 18px;
          font-size: 13.5px;
          font-family: 'Montserrat', sans-serif;
          font-weight: 500;
          color: #333;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          white-space: nowrap;
        }
        .pl-sort-option:hover { background: #f5f5f5; color: #111; }
        .pl-sort-option.selected { background: #222; color: #fff; font-weight: 700; }

        /* ── PRODUCT GRID ── */
        .pl-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px 20px;
          margin-bottom: 40px;
        }

        .pl-pcard { cursor: pointer; }
        .pl-pimg-wrap {
          position: relative;
          overflow: hidden;
          background: #f5f5f5;
          margin-bottom: 0;
        }
        .pl-pimg-wrap a { display: block; }
        .pl-pimg-wrap img {
          width: 100%;
          aspect-ratio: 3/4;
          object-fit: cover;
          object-position: top center;
          display: block;
          transition: transform 0.35s ease;
        }
        .pl-pcard:hover .pl-pimg-wrap img { transform: scale(1.04); }

        .pl-pinfo { padding: 10px 0 6px; }
        .pl-pname {
          font-size: 13px;
          color: #222;
          text-decoration: none;
          font-weight: 500;
          line-height: 1.45;
          display: block;
          margin-bottom: 10px;
        }
        .pl-pname:hover { color: #871B1B; }

        .pl-price-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .pl-price-current {
          font-size: 14px;
          font-weight: 700;
          color: #111;
        }
        .pl-price-original {
          font-size: 13px;
          color: #aaa;
          text-decoration: line-through;
          font-weight: 400;
        }

        /* ── PAGINATION ── */
        .pl-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .pl-pg-btn {
          min-width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid #d0d0d0;
          background: #fff;
          font-size: 13.5px;
          font-family: 'Montserrat', sans-serif;
          font-weight: 600;
          color: #333;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          padding: 0 4px;
        }
        .pl-pg-btn:hover:not(:disabled):not(.active) {
          border-color: #222;
          color: #111;
        }
        .pl-pg-btn.active {
          background: #111;
          color: #fff;
          border-color: #111;
        }
        .pl-pg-btn:disabled { opacity: 0.4; cursor: default; }
        .pl-pg-ellipsis { border: none; background: none; cursor: default; }
        .pl-pg-next { font-size: 16px; }

        /* ── RESPONSIVE ── */
        @media (max-width: 1100px) {
          .pl-layout { padding: 0 24px 48px; }
          .pl-sidebar { flex: 0 0 230px; width: 230px; }
        }
        @media (max-width: 900px) {
          .pl-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 1520px) {
          .pl-breadcrumb-wrap { padding: 13px 24px; }
          .pl-layout { padding: 0 16px 48px; }
          .pl-sidebar { flex: 0 0 220px; width: 220px; }
          .pl-main { padding-left: 20px; }
        }
        @media (max-width: 640px) {
          .pl-sidebar { display: none; }
          .pl-main { padding-left: 0; }
          .pl-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
        }
      `}</style>

      {/* ── BREADCRUMB ── */}
      <div className="pl-breadcrumb-wrap">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <Link to="/">Trang chủ</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Thời Trang Nữ
            </li>
          </ol>
        </nav>
      </div>

      {/* ── LAYOUT: SIDEBAR + MAIN ── */}
      <div className="pl-layout">
        {/* ══════════ SIDEBAR ══════════ */}
        <aside className="pl-sidebar">
          {/* DANH MỤC */}
          <div className="pl-sidebar-section">
            <div className="pl-sidebar-title">Danh Mục Sản Phẩm</div>

            <button
              className="pl-cat-all-btn"
              onClick={() => setShowAll((s) => !s)}
            >
              Xem tất cả danh mục
              <i
                className={`bi bi-chevron-${showAllCats ? "up" : "down"}`}
                style={{ fontSize: 11 }}
              />
            </button>

            <div className="pl-sidebar-scroll">
              <ul className="pl-cat-list">
                {visibleCategories.map((cat) => (
                  <li key={cat.label} className="pl-cat-item">
                    <div className="pl-cat-row">
                      <Link
                        to="#"
                        className="pl-cat-row"
                        style={{ flex: 1, padding: 0 }}
                      >
                        {cat.label}
                      </Link>
                      {cat.children && (
                        <button
                          className="pl-cat-toggle"
                          onClick={() => toggleCat(cat.label)}
                          aria-label="Mở rộng"
                        >
                          {openCats[cat.label] ? "−" : "+"}
                        </button>
                      )}
                      {!cat.children && (
                        <button
                          className="pl-cat-toggle"
                          style={{ visibility: "hidden" }}
                        >
                          +
                        </button>
                      )}
                    </div>
                    {cat.children && openCats[cat.label] && (
                      <ul className="pl-subcat-list">
                        {cat.children.map((sub) => (
                          <li key={sub}>
                            <Link to="#">{sub}</Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* NƠI BÁN */}
          <div className="pl-sidebar-section">
            <div className="pl-sidebar-title">Nơi Bán</div>
            <ul className="pl-check-list">
              {["Hồ Chí Minh", "Hà Nội"].map((loc) => (
                <li
                  key={loc}
                  onClick={() => toggleCheck(setCheckedLocation, loc)}
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={checkedLocation.includes(loc)}
                  />
                  {loc}
                </li>
              ))}
            </ul>
          </div>

          {/* THƯƠNG HIỆU */}
          <div className="pl-sidebar-section">
            <div className="pl-sidebar-title">Thương Hiệu</div>
            <ul className="pl-check-list">
              {["Rubies Studio", "Rubies Rubies"].map((b) => (
                <li key={b} onClick={() => toggleCheck(setCheckedBrand, b)}>
                  <input
                    type="checkbox"
                    readOnly
                    checked={checkedBrand.includes(b)}
                  />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* CHỌN MỨC GIÁ */}
          <div className="pl-sidebar-section">
            <div className="pl-sidebar-title">Chọn Mức Giá</div>
            <div className="pl-price-scroll">
              <ul className="pl-check-list">
                {[
                  "Dưới 200.000đ",
                  "Từ 200.000đ - 400.000đ",
                  "Từ 400.000đ - 600.000đ",
                  "Từ 600.000đ - 800.000đ",
                  "Từ 800.000đ - 1 triệu",
                ].map((r) => (
                  <li key={r} onClick={() => toggleCheck(setCheckedPrice, r)}>
                    <input
                      type="checkbox"
                      readOnly
                      checked={checkedPrice.includes(r)}
                    />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* KÍCH THƯỚC */}
          <div className="pl-sidebar-section">
            <div className="pl-sidebar-title">Kích Thước</div>
            <div className="pl-size-wrap">
              {["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map((sz) => (
                <button key={sz} className="pl-size-btn">
                  {sz}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ══════════ MAIN ══════════ */}
        <main className="pl-main">
          {/* TOP ROW */}
          <div className="pl-main-top">
            <h1 className="pl-main-heading">Thời Trang Nữ</h1>

            {/* Sort dropdown */}
            <div className="pl-sort-wrap">
              <button
                className="pl-sort-btn"
                onClick={() => setSortOpen((s) => !s)}
              >
                <i className="bi bi-sort-down-alt" />
                Sắp xếp:&nbsp;<strong>{sortLabel}</strong>
                <i className="bi bi-chevron-down" />
              </button>

              {sortOpen && (
                <div className="pl-sort-menu">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`pl-sort-option${sortVal === opt.value ? " selected" : ""}`}
                      onClick={() => handleSort(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* GRID */}

          {loading ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              Đang tải sản phẩm...
            </div>
          ) : (
            <>
              <div className="pl-grid">
                {displayed.map((p) => (
                  <div className="pl-pcard" key={p.product_id}>
                    <div className="pl-pimg-wrap">
                      <Link to={`/san-pham/${p.product_id}`}>
                        <img
                          src={p.image_url}
                          alt={p.product_name}
                          loading="lazy"
                        />
                      </Link>
                    </div>

                    <div className="pl-pinfo">
                      <Link
                        to={`/san-pham/${p.product_id}`}
                        className="pl-pname"
                      >
                        {p.product_name}
                      </Link>

                      <div className="pl-price-row">
                        <span className="pl-price-current">
                          {fmt(p.discount_price)}
                        </span>

                        <span className="pl-price-original">
                          {fmt(p.original_price)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Pagination
                page={pagination.currentPage}
                total={pagination.totalPages}
                onChange={handlePage}
              />
            </>
          )}
        </main>
      </div>

      {/* Đóng sort menu khi click ngoài */}
      {sortOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => setSortOpen(false)}
        />
      )}
    </>
  );
}

// frontend\src\pages\ProductList.jsx
import { useState } from "react";
import { Link } from "react-router-dom";

/* ── DỮ LIỆU MẪU ── */
const PRODUCTS = Array.from({ length: 74 * 9 }, (_, i) => ({
  id: i + 1,
  name: [
    "Áo Kiểu Nữ Nami Top RR26AK53",
    "Quần Jeans Nữ Eric RR26QJ10",
    "Quần Jeans Nữ Alan Short RR26QJ09",
    "Đầm Linen Nữ Calla RR26DL04",
    "Áo Halter Nữ Vero RR26AH12",
    "Áo Thun Nữ Basic RR26AT01",
    "Váy Midi Lace RR26VM08",
    "Set Đồ Nữ Coco RR26SD05",
    "Jumpsuit Nữ Rena RR26JS07",
  ][i % 9],
  price: [440000, 620000, 590000, 750000, 380000, 290000, 680000, 820000, 540000][i % 9],
  originalPrice: [550000, 780000, 720000, 900000, 480000, 360000, 850000, 1000000, 680000][i % 9],
  img: [
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=440&h=600&fit=crop&crop=top",
    "https://images.unsplash.com/photo-1541338998-54e43a3254ef?w=440&h=600&fit=crop&crop=top",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=440&h=600&fit=crop&crop=top",
    "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=440&h=600&fit=crop&crop=top",
    "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=440&h=600&fit=crop&crop=top",
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=440&h=600&fit=crop&crop=top",
    "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=440&h=600&fit=crop&crop=top",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=440&h=600&fit=crop&crop=top",
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=440&h=600&fit=crop&crop=top",
  ][i % 9],
  slug: `san-pham-${i + 1}`,
}));

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

const SORT_OPTIONS = [
  { value: "default", label: "Mặc định" },
  { value: "az",      label: "A → Z" },
  { value: "za",      label: "Z → A" },
  { value: "price_asc",  label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "newest", label: "Hàng mới nhất" },
  { value: "oldest", label: "Hàng cũ nhất" },
];

const PER_PAGE = 9;
const TOTAL_PAGES = Math.ceil(PRODUCTS.length / PER_PAGE);

function fmt(n) {
  return n.toLocaleString("vi-VN") + "vnđ";
}

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
          <button key={`ellipsis-${idx}`} className="pl-pg-btn pl-pg-ellipsis" disabled>
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
        )
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
  const [openCats, setOpenCats]   = useState({});
  const [showAllCats, setShowAll] = useState(false);
  const [sortOpen, setSortOpen]   = useState(false);
  const [sortVal, setSortVal]     = useState("default");
  const [page, setPage]           = useState(1);

  /* filter / sort */
  const [checkedBrand, setCheckedBrand] = useState([]);
  const [checkedPrice, setCheckedPrice] = useState([]);
  const [checkedLocation, setCheckedLocation] = useState([]);

  const toggleCat = (label) =>
    setOpenCats(prev => ({ ...prev, [label]: !prev[label] }));

  const toggleCheck = (setter, getter, val) =>
    setter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortVal)?.label ?? "Mặc định";

  /* sort products (demo) */
  let displayed = [...PRODUCTS];
  if (sortVal === "az") displayed.sort((a, b) => a.name.localeCompare(b.name));
  if (sortVal === "za") displayed.sort((a, b) => b.name.localeCompare(a.name));
  if (sortVal === "price_asc")  displayed.sort((a, b) => a.price - b.price);
  if (sortVal === "price_desc") displayed.sort((a, b) => b.price - a.price);

  const pageProducts = displayed.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSort = (val) => { setSortVal(val); setSortOpen(false); setPage(1); };
  const handlePage = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };

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
            <li className="breadcrumb-item"><Link to="/">Trang chủ</Link></li>
            <li className="breadcrumb-item active" aria-current="page">Thời Trang Nữ</li>
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

            <button className="pl-cat-all-btn" onClick={() => setShowAll(s => !s)}>
              Xem tất cả danh mục
              <i className={`bi bi-chevron-${showAllCats ? "up" : "down"}`} style={{ fontSize: 11 }} />
            </button>

            <div className="pl-sidebar-scroll">
              <ul className="pl-cat-list">
                {CATEGORIES.map(cat => (
                  <li key={cat.label} className="pl-cat-item">
                    <div className="pl-cat-row">
                      <Link to="#" className="pl-cat-row" style={{ flex: 1, padding: 0 }}>
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
                        <button className="pl-cat-toggle" style={{ visibility: "hidden" }}>+</button>
                      )}
                    </div>
                    {cat.children && openCats[cat.label] && (
                      <ul className="pl-subcat-list">
                        {cat.children.map(sub => (
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
              {["Hồ Chí Minh", "Hà Nội"].map(loc => (
                <li key={loc} onClick={() => toggleCheck(setCheckedLocation, checkedLocation, loc)}>
                  <input type="checkbox" readOnly checked={checkedLocation.includes(loc)} />
                  {loc}
                </li>
              ))}
            </ul>
          </div>

          {/* THƯƠNG HIỆU */}
          <div className="pl-sidebar-section">
            <div className="pl-sidebar-title">Thương Hiệu</div>
            <ul className="pl-check-list">
              {["Rubies Studio", "Rubies Rubies"].map(b => (
                <li key={b} onClick={() => toggleCheck(setCheckedBrand, checkedBrand, b)}>
                  <input type="checkbox" readOnly checked={checkedBrand.includes(b)} />
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
                ].map(r => (
                  <li key={r} onClick={() => toggleCheck(setCheckedPrice, checkedPrice, r)}>
                    <input type="checkbox" readOnly checked={checkedPrice.includes(r)} />
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
              {["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map(sz => (
                <button key={sz} className="pl-size-btn">{sz}</button>
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
              <button className="pl-sort-btn" onClick={() => setSortOpen(s => !s)}>
                <i className="bi bi-sort-down-alt" />
                Sắp xếp:&nbsp;<strong>{sortLabel}</strong>
                <i className="bi bi-chevron-down" />
              </button>

              {sortOpen && (
                <div className="pl-sort-menu">
                  {SORT_OPTIONS.map(opt => (
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
          <div className="pl-grid">
            {pageProducts.map(p => (
              <div className="pl-pcard" key={p.id}>
                <div className="pl-pimg-wrap">
                  <Link to={`/san-pham/${p.slug}`}>
                    <img src={p.img} alt={p.name} loading="lazy" />
                  </Link>
                </div>
                <div className="pl-pinfo">
                  <Link to={`/san-pham/${p.slug}`} className="pl-pname">{p.name}</Link>
                  <div className="pl-price-row">
                    <span className="pl-price-current">{fmt(p.price)}</span>
                    <span className="pl-price-original">{fmt(p.originalPrice)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* PAGINATION */}
          <Pagination page={page} total={TOTAL_PAGES} onChange={handlePage} />

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
// frontend\src\pages\Admin\Products\index.jsx
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getAdminProducts } from "../../../services/product.service";
import Pagination from "../../../components/common/Pagination";
import { Helmet } from "react-helmet-async";

const fmtVND = (n) => (n || 0).toLocaleString("vi-VN") + "đ";
const PRODUCTS_PER_PAGE = 12;

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang bán" },
  { key: "inactive", label: "Đã ẩn" },
];

const PRICE_RANGES = [
  { key: "all", label: "Tất cả mức giá" },
  { key: "0", label: "Dưới 200.000đ" },
  { key: "200", label: "200.000đ – 500.000đ" },
  { key: "500", label: "500.000đ – 1.000.000đ" },
  { key: "1000", label: "Trên 1.000.000đ" },
];

const statusMap = {
  active: { dot: "#22C55E", text: "#16A34A", label: "Published" },
  inactive: { dot: "#EF4444", text: "#DC2626", label: "Inactive" },
  archived: { dot: "#9CA0AC", text: "#6B7280", label: "Archived" },
};

export default function AdminProducts() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [filterPrice, setFilterPrice] = useState("all");
  const [locked, setLocked] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: PRODUCTS_PER_PAGE,
    total_items: 0,
    total_pages: 0,
  });

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const res = await getAdminProducts(page, PRODUCTS_PER_PAGE);

      setProducts(res.data?.products || []);

      setPagination(
        res.data?.pagination || {
          page: 1,
          limit: PRODUCTS_PER_PAGE,
          total_items: 0,
          total_pages: 0,
        },
      );

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if (page === 1) {
            next.delete("page");
          } else {
            next.set("page", page);
          }

          return next;
        },
        { replace: true },
      );
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Không thể tải danh sách sản phẩm!",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(initialPage);
  }, []);

  /* ── unique categories from current page ── */
  const categories = [
    "all",
    ...new Set(products.map((p) => p.category_name).filter(Boolean)),
  ];

  /* ── filter ── */
  const priceInRange = (p) => {
    const price = p.discount_price || p.price || 0;
    if (filterPrice === "all") return true;
    if (filterPrice === "0") return price < 200000;
    if (filterPrice === "200") return price >= 200000 && price < 500000;
    if (filterPrice === "500") return price >= 500000 && price < 1000000;
    if (filterPrice === "1000") return price >= 1000000;
    return true;
  };

  const filtered = products.filter((p) => {
    const effectiveStatus = locked[p.product_id] ? "archived" : p.status;
    const matchSearch = p.product_name
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchTab = tab === "all" || effectiveStatus === tab;
    const matchCat = filterCat === "all" || p.category_name === filterCat;
    return matchSearch && matchTab && matchCat && priceInRange(p);
  });

  /* ── lock / unlock ── */
  const handleLock = (id, name) => {
    const isLocked = !!locked[id];
    setLocked((prev) => ({ ...prev, [id]: !isLocked }));
    toast.success(
      isLocked ? `Đã mở khoá "${name}"` : `Đã khoá "${name}" → Archived`,
    );
  };

  const handleResetFilters = () => {
    setSearch("");
    setTab("all");
    setFilterCat("all");
    setFilterPrice("all");
  };

  return (
    <>
      <style>{`
        .adm-page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
        .adm-page-title { font-size: 26px; font-weight: 800; color: #17151F; margin-bottom: 4px; }
        .adm-page-sub { font-size: 14px; color: #9CA0AC; font-weight: 500; }
        .adm-head-actions { display: flex; gap: 10px; }
        .adm-btn-ghost {
          display: flex; align-items: center; gap: 7px; background: #fff; border: 1px solid #ECEBF2;
          color: #17151F; font-size: 13.5px; font-weight: 700; padding: 10px 16px; border-radius: 10px;
          cursor: pointer; transition: all 0.15s;
        }
        .adm-btn-ghost:hover { border-color: #C9C3F8; background: #F8F7FC; }
        .adm-btn-dark {
          display: flex; align-items: center; gap: 7px; background: #17151F; border: 1px solid #17151F;
          color: #fff; font-size: 13.5px; font-weight: 700; padding: 10px 18px; border-radius: 10px;
          cursor: pointer; text-decoration: none; transition: opacity 0.15s;
        }
        .adm-btn-dark:hover { opacity: 0.85; color: #fff; }

        /* ── TOOLBAR ── */
        .adm-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
        .adm-toolbar-search { position: relative; flex: 1; min-width: 200px; max-width: 280px; }
        .adm-toolbar-search i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #B4B2C0; font-size: 14px; pointer-events: none; }
        .adm-toolbar-search input {
          width: 100%; height: 40px; border-radius: 10px; border: 1.5px solid #ECEBF2; background: #fff;
          padding: 0 14px 0 38px; font-size: 13.5px; font-family: 'Nunito', sans-serif; outline: none; color: #17151F;
        }
        .adm-toolbar-search input:focus { border-color: #C9C3F8; }
        .adm-toolbar-search input::placeholder { color: #B4B2C0; }

        .adm-filter-select {
          height: 40px; border-radius: 10px; border: 1.5px solid #ECEBF2; background: #fff;
          padding: 0 32px 0 12px; font-size: 13.5px; font-family: 'Nunito', sans-serif;
          font-weight: 600; color: #17151F; outline: none; cursor: pointer; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%239CA0AC' d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          min-width: 160px;
        }
        .adm-filter-select:focus { border-color: #C9C3F8; }

        .adm-tabs { margin-left: auto; display: flex; gap: 2px; background: #F4F3F8; border-radius: 10px; padding: 3px; }
        .adm-tab-btn { border: none; background: none; padding: 7px 16px; font-size: 13px; font-weight: 700; color: #9CA0AC; border-radius: 8px; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .adm-tab-btn.active { background: #fff; color: #17151F; box-shadow: 0 1px 3px rgba(17,15,31,0.08); }

        /* ── TABLE ── */
        .adm-table-wrap { border-top: 1px solid #F0EFF5; }
        .adm-table th { font-size: 12.5px; font-weight: 700; color: #9CA0AC; border-bottom: 1px solid #F0EFF5 !important; padding: 13px 14px; white-space: nowrap; }
        .adm-table td { font-size: 13.5px; color: #17151F; border-color: #F5F4F9 !important; padding: 12px 14px; vertical-align: middle; }
        .adm-table tbody tr { transition: background 0.12s; }
        .adm-table tbody tr:hover { background: #FAFAFC; }

        .adm-stt { font-size: 13px; font-weight: 700; color: #9CA0AC; }

        .adm-pcell { display: flex; align-items: center; gap: 12px; }
        .adm-pthumb { width: 42px; height: 42px; border-radius: 10px; object-fit: cover; background: #F0EFF5; flex-shrink: 0; }
        .adm-pname { font-weight: 800; color: #17151F; }
        .adm-psub { font-size: 12px; color: #9CA0AC; font-weight: 600; }
        .adm-sub-line { font-size: 12px; color: #9CA0AC; font-weight: 600; }

        .adm-status { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; }
        .adm-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        /* ── ACTION BUTTONS ── */
        .adm-action-btn {
          width: 32px; height: 32px; border-radius: 8px; border: none; background: none;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; cursor: pointer; transition: background 0.15s, color 0.15s; color: #9CA0AC;
        }
        .adm-action-btn:hover { background: #F0EFF5; color: #17151F; }
        .adm-action-btn.lock:hover { background: #FFF0F0; color: #DC2626; }
        .adm-action-btn.unlock:hover { background: #F0FDF4; color: #16A34A; }

        .adm-btn-reset {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  border: 1.5px solid #ECEBF2;
  border-radius: 10px;
  background: #fff;
  color: #6B7280;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.adm-btn-reset:hover {
  color: #17151F;
  border-color: #C9C3F8;
  background: #F8F7FC;
}

.adm-product-link {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.adm-product-link:hover .adm-pname {
  color: #871b1b;
}

.adm-pcell > .adm-product-link:hover .adm-pthumb {
  opacity: 0.85;
}

.adm-original-price {
  font-size: 12px;
  color: #9CA0AC;
  font-weight: 600;
  text-decoration: line-through;
  margin-top: 2px;
}
      `}</style>

      <Helmet>
        <title>Quản lý sản phẩm | Selene</title>
      </Helmet>

      {/* ── PAGE HEADER ── */}
      <div className="adm-page-head">
        <div>
          <div className="adm-page-title">Sản phẩm</div>
        </div>
        <div className="adm-head-actions">
          <button
            className="adm-btn-ghost"
            onClick={() =>
              toast.info("Tính năng xuất dữ liệu đang được phát triển")
            }
          >
            <i className="bi bi-download" /> Xuất dữ liệu
          </button>
          <Link to="/admin/san-pham/them-moi" className="adm-btn-dark">
            <i className="bi bi-plus-lg" /> Thêm sản phẩm
          </Link>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="adm-toolbar">
        {/* Search */}
        <div className="adm-toolbar-search">
          <i className="bi bi-search" />
          <input
            placeholder="Tìm theo tên hoặc mã sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter: Danh mục */}
        <select
          className="adm-filter-select"
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="all">Tất cả danh mục</option>
          {categories
            .filter((c) => c !== "all")
            .map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
        </select>

        {/* Filter: Giá */}
        <select
          className="adm-filter-select"
          value={filterPrice}
          onChange={(e) => setFilterPrice(e.target.value)}
          style={{ minWidth: 190 }}
        >
          {PRICE_RANGES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="adm-btn-reset"
          onClick={handleResetFilters}
          title="Đặt lại bộ lọc"
        >
          <i className="bi bi-arrow-counterclockwise" />
          Đặt lại
        </button>

        {/* Tabs */}
        <div className="adm-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`adm-tab-btn${tab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="adm-table-wrap table-responsive">
        <table className="table adm-table mb-0">
          <thead>
            <tr>
              <th style={{ width: 48 }}>#</th>
              <th>Sản phẩm</th>
              <th>Danh mục</th>
              <th>Giá bán</th>
              <th>Tồn kho</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center text-muted py-5"
                  style={{ fontSize: 14 }}
                >
                  Đang tải danh sách sản phẩm...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center text-danger py-5"
                  style={{ fontSize: 14 }}
                >
                  {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center text-muted py-5"
                  style={{ fontSize: 14 }}
                >
                  <i
                    className="bi bi-inbox"
                    style={{
                      fontSize: 32,
                      display: "block",
                      marginBottom: 8,
                      opacity: 0.3,
                    }}
                  />
                  Không tìm thấy sản phẩm
                </td>
              </tr>
            ) : (
              filtered.map((p, idx) => {
                const isLocked = !!locked[p.product_id];
                const effectiveKey = isLocked
                  ? "archived"
                  : p.status || "inactive";
                const status = statusMap[effectiveKey] || {
                  dot: "#9CA0AC",
                  text: "#6B7280",
                  label: effectiveKey,
                };
                const stt = (pagination.page - 1) * pagination.limit + idx + 1;

                return (
                  <tr key={p.product_id}>
                    {/* STT */}
                    <td>
                      <span className="adm-stt">{stt}</span>
                    </td>

                    {/* Product Name */}
                    <td>
                      <div className="adm-pcell">
                        <Link
                          to={`/san-pham/${p.product_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="adm-product-link"
                        >
                          <img
                            src={p.image_url}
                            alt={p.product_name}
                            className="adm-pthumb"
                          />
                        </Link>

                        <div>
                          <Link
                            to={`/san-pham/${p.product_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="adm-product-link"
                          >
                            <div className="adm-pname">{p.product_name}</div>
                          </Link>

                          <div className="adm-psub">
                            {p.product_id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* ID */}
                    <td>
                      <div>{p.category_name || "—"}</div>
                    </td>

                    {/* Giá bán */}
                    <td>
                      <div className="fw-bold">
                        {fmtVND(p.price)}
                      </div>

                      {p.original_price ? (
                        <div className="adm-original-price">
                          {fmtVND(p.original_price)}
                        </div>
                      ) : null}
                    </td>

                    {/* Stock */}
                    <td>{(p.stock_quantity || 0).toLocaleString("vi-VN")}</td>

                    {/* Status */}
                    <td>
                      <span
                        className="adm-status"
                        style={{ color: status.text }}
                      >
                        <span
                          className="adm-status-dot"
                          style={{ background: status.dot }}
                        />
                        {status.label}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td>
                      <div className="d-flex gap-1">
                        {/* Sửa */}
                        <Link
                          to={`/admin/san-pham/${p.product_id}/sua`}
                          className="adm-action-btn"
                          title="Chỉnh sửa"
                        >
                          <i className="bi bi-pencil" />
                        </Link>

                        {/* Khoá / Mở khoá */}
                        <button
                          className={`adm-action-btn ${isLocked ? "unlock" : "lock"}`}
                          title={
                            isLocked
                              ? "Mở khoá sản phẩm"
                              : "Khoá sản phẩm (Archived)"
                          }
                          onClick={() =>
                            handleLock(p.product_id, p.product_name)
                          }
                        >
                          <i
                            className={`bi ${isLocked ? "bi-unlock" : "bi-lock"}`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── PAGINATION ── */}
      <Pagination
        page={pagination.page}
        totalPages={pagination.total_pages}
        totalItems={pagination.total_items}
        displayedCount={filtered.length}
        label="sản phẩm"
        onPageChange={fetchProducts}
      />
    </>
  );
}

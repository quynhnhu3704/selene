// frontend\src\pages\Admin\Products\index.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getAdminProductCategories,
  getAdminProducts,
  updateAdminProductStatus,
  exportProductsToExcel,
} from "../../../services/product.service";
import Pagination from "../../../components/common/Pagination";
import Loading from "../../../components/common/Loading";
import defaultImage from "../../../assets/images/default-product.png";
import { Helmet } from "react-helmet-async";

const fmtVND = (n) => (n || 0).toLocaleString("vi-VN") + "đ";
const PRODUCTS_PER_PAGE = 12;

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "active", label: "Hoạt động" },
  { key: "inactive", label: "Đã khóa" },
];

const SORT_OPTIONS = [
  { key: "default", label: "Mặc định" },
  { key: "az", label: "Tên: A → Z" },
  { key: "za", label: "Tên: Z → A" },
  { key: "price_asc", label: "Giá: Thấp → Cao" },
  { key: "price_desc", label: "Giá: Cao → Thấp" },
  { key: "stock_asc", label: "Tồn kho: Ít → Nhiều" },
  { key: "stock_desc", label: "Tồn kho: Nhiều → Ít" },
];

export default function AdminProducts() {
  const saveScrollPosition = () => {
    sessionStorage.setItem("admin-products-scroll", String(window.scrollY));
  };
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const selectedSort = searchParams.get("sort") || "default";
  const selectedStatus = searchParams.get("status") || "";
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;

  const sort = SORT_OPTIONS.some((item) => item.key === selectedSort)
    ? selectedSort
    : "default";
  const status = TABS.some((tab) => tab.key === selectedStatus)
    ? selectedStatus
    : "";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [searchValue, setSearchValue] = useState(q);
  const categoryRef = useRef(null);
  const sortRef = useRef(null);
  const isComposing = useRef(false);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PRODUCTS_PER_PAGE,
    total_items: 0,
    total_pages: 0,
  });

  const updateProductQuery = (changes, options = {}) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const shouldResetPage = ["q", "category", "sort", "status"].some(
        (key) => key in changes,
      );

      Object.entries(changes).forEach(([key, value]) => {
        const normalizedValue = key === "q" ? value.trim() : value;
        const isDefaultValue =
          !normalizedValue || (key === "page" && Number(normalizedValue) === 1);

        if (isDefaultValue) {
          next.delete(key);
          return;
        }

        next.set(key, String(normalizedValue));
      });

      if (shouldResetPage && !("page" in changes)) {
        next.delete("page");
      }

      return next;
    }, options);
  };

  useEffect(() => {
    let isCurrentRequest = true;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await getAdminProducts({
          q,
          category,
          sort,
          status,
          page,
          limit: PRODUCTS_PER_PAGE,
        });

        if (!isCurrentRequest) return;

        setProducts(res.data?.products || []);
        setPagination(
          res.data?.pagination || {
            page: 1,
            limit: PRODUCTS_PER_PAGE,
            total_items: 0,
            total_pages: 0,
          },
        );
      } catch (err) {
        if (!isCurrentRequest) return;

        console.error(err);
        setError(
          err.response?.data?.message || "Không thể tải danh sách sản phẩm!",
        );
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      isCurrentRequest = false;
    };
  }, [q, category, sort, status, page]);

  useEffect(() => {
    const savedScroll = sessionStorage.getItem("admin-products-scroll");

    if (savedScroll !== null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, Number(savedScroll));
      });

      sessionStorage.removeItem("admin-products-scroll");
    }
  }, []);

  useEffect(() => {
    setSearchValue(q);
  }, [q]);

  useEffect(() => {
    let isCurrentRequest = true;

    const fetchCategories = async () => {
      try {
        const res = await getAdminProductCategories();
        if (isCurrentRequest) setCategories(res.data || []);
      } catch (err) {
        console.error("Không thể tải danh mục cho bộ lọc:", err);
      }
    };

    fetchCategories();

    return () => {
      isCurrentRequest = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setCategoryOpen(false);
      }

      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* ── lock / unlock ── */
  const handleLock = async (product) => {
    // Bao quát cả hai trường hợp "inactive" hoặc "archived" là đã bị khóa
    const isLocked =
      product.status === "inactive" || product.status === "archived";
    const nextStatus = isLocked ? "active" : "inactive";

    try {
      setUpdatingProductId(product.product_id);

      await updateAdminProductStatus(product.product_id, nextStatus);

      // Load lại danh sách theo filter + pagination hiện tại
      const res = await getAdminProducts({
        q,
        category,
        sort,
        status,
        page,
        limit: PRODUCTS_PER_PAGE,
      });

      setProducts(res.data?.products || []);

      setPagination(
        res.data?.pagination || {
          page: 1,
          limit: PRODUCTS_PER_PAGE,
          total_items: 0,
          total_pages: 0,
        },
      );

      toast.success(
        isLocked
          ? `Đã mở khóa "${product.product_name}"`
          : `Đã khóa "${product.product_name}"`,
      );
    } catch (err) {
      console.error(err);

      toast.error(
        err.response?.data?.message ||
          "Không thể cập nhật trạng thái sản phẩm!",
      );
    } finally {
      setUpdatingProductId("");
    }
  };

  /* ── export excel ── */
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      toast.info("Đang chuẩn bị xuất dữ liệu, vui lòng đợi...");

      const blob = await exportProductsToExcel();

      const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const filename = `products_export_${dateStr}.xlsx`;

      // Tạo đường dẫn tải xuống cho trình duyệt
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      // Dọn dẹp bộ nhớ
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Xuất dữ liệu Excel thành công!");
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          "Lỗi khi tải file hoặc xuất dữ liệu Excel!",
      );
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchValue("");

    updateProductQuery({
      q: "",
      category: "",
      sort: "",
      status: "",
      page: 1,
    });
  };

  const selectedCategory = categories.find(
    (item) => item.category_id === category,
  );

  return (
    <>
      <Helmet>
        <title>Quản lý sản phẩm | Selene</title>
      </Helmet>

      {/* ── PAGE HEADER ── */}
      <div className="adm-page-head">
        <div>
          <div className="adm-page-title">Sản phẩm</div>
        </div>
        <div className="d-flex gap-3">
          <button
            className="form-btn btn btn-outline-dark btn-export fw-semibold px-4 d-flex align-items-center justify-content-center"
            disabled={exporting}
            onClick={handleExportExcel}
            style={{ minWidth: "140px" }}
          >
            {exporting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                Đang xuất...
              </>
            ) : (
              <>
                <i className="bi bi-download me-2" /> Xuất dữ liệu
              </>
            )}
          </button>
          <Link
            to="/admin/san-pham/them-moi"
            className="form-btn btn btn-dark fw-semibold px-4"
          >
            <i className="bi bi-plus-lg me-1" /> Thêm sản phẩm
          </Link>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="adm-toolbar">
        {/* Search */}
        <div className="adm-toolbar-search">
          <i className="bi bi-search" />
          <input
            className="form-control"
            placeholder="Tìm theo tên hoặc mã sản phẩm..."
            value={searchValue}
            onCompositionStart={() => {
              isComposing.current = true;
            }}
            onCompositionEnd={(e) => {
              isComposing.current = false;
              updateProductQuery({ q: e.target.value }, { replace: true });
            }}
            onChange={(e) => {
              const value = e.target.value;

              setSearchValue(value);

              if (!isComposing.current) {
                updateProductQuery({ q: value }, { replace: true });
              }
            }}
          />
        </div>

        {/* Filter: Danh mục */}
        <div
          className="dropdown"
          ref={categoryRef}
          style={{ width: "17.5%", minWidth: 190 }}
        >
          <button
            type="button"
            className="form-control text-start d-flex justify-content-between align-items-center"
            onClick={() => setCategoryOpen((prev) => !prev)}
          >
            <span>
              <i className="bi bi-funnel me-2" />
              {selectedCategory?.name || "Tất cả danh mục"}
            </span>

            <i
              className={`bi ${categoryOpen ? "bi-caret-up" : "bi-caret-down"}`}
            />
          </button>

          {categoryOpen && (
            <ul className="dropdown-menu show w-100 mt-1 shadow-sm">
              <li>
                <button
                  type="button"
                  className="dropdown-item fw-normal"
                  onClick={() => {
                    updateProductQuery({ category: "" });
                    setCategoryOpen(false);
                  }}
                >
                  Tất cả danh mục
                </button>
              </li>

              {categories.map((item) => (
                <li key={item.category_id}>
                  <button
                    type="button"
                    className="dropdown-item fw-normal"
                    onClick={() => {
                      updateProductQuery({ category: item.category_id });
                      setCategoryOpen(false);
                    }}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Filter: Sắp xếp */}
        <div
          className="dropdown"
          ref={sortRef}
          style={{ width: "17.5%", minWidth: 190 }}
        >
          <button
            type="button"
            className="form-control text-start d-flex justify-content-between align-items-center"
            onClick={() => setSortOpen((prev) => !prev)}
          >
            <span>
              <i className="bi bi-sort-down me-2" />
              {SORT_OPTIONS.find((s) => s.key === sort)?.label ||
                "Sắp xếp mặc định"}
            </span>
            <i className={`bi ${sortOpen ? "bi-caret-up" : "bi-caret-down"}`} />
          </button>

          {sortOpen && (
            <ul className="dropdown-menu show w-100 mt-1 shadow-sm">
              {SORT_OPTIONS.map((s) => (
                <li key={s.key}>
                  <button
                    type="button"
                    className="dropdown-item fw-normal"
                    onClick={() => {
                      updateProductQuery({ sort: s.key });
                      setSortOpen(false);
                    }}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="reset"
          className="form-btn btn btn-outline-dark fw-semibold mb-0 px-4"
          onClick={handleResetFilters}
        >
          <i className="bi bi-arrow-counterclockwise me-1" /> Đặt lại
        </button>

        {/* Tabs */}
        <div className="adm-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`adm-tab-btn${status === t.key ? " active" : ""}`}
              onClick={() => updateProductQuery({ status: t.key })}
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
              <th className="text-center" style={{ width: "5%" }}></th>
              <th style={{ width: "38%" }}>Sản phẩm</th>
              <th className="text-center">Danh mục</th>
              <th className="text-end">Giá bán</th>
              <th className="text-center">Tồn kho</th>
              <th className="text-center">Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-5">
                  <Loading text="Đang tải sản phẩm..." />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center text-danger fw-semibold py-5"
                  style={{ fontSize: 14 }}
                >
                  {error}
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="page-empty py-5">
                  <i className="bi bi-inbox page-empty-icon" />
                  <p
                    className="mt-3 mb-1 fw-semibold text-secondary"
                    style={{ fontSize: 16 }}
                  >
                    Không tìm thấy sản phẩm
                  </p>
                  <p className="text-muted mb-3" style={{ fontSize: 14 }}>
                    Thử lại với từ khóa hoặc bộ lọc khác!
                  </p>
                </td>
              </tr>
            ) : (
              products.map((p, idx) => {
                const isLocked =
                  p.status === "inactive" || p.status === "archived";
                const isUpdating = updatingProductId === p.product_id;
                const effectiveStatus = p.status;

                const stt = (pagination.page - 1) * pagination.limit + idx + 1;

                return (
                  <tr key={p.product_id}>
                    {/* STT */}
                    <td className="text-center">
                      <span className="adm-stt">{stt}</span>
                    </td>

                    {/* Product Name */}
                    <td>
                      <div className="adm-cell">
                        <Link
                          to={`/san-pham/${p.product_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="adm-link"
                        >
                          <img
                            src={p.image_url}
                            // alt={p.product_name}
                            className="adm-thumb"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = defaultImage;
                            }}
                          />
                        </Link>

                        <div>
                          <Link
                            to={`/san-pham/${p.product_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="adm-link"
                          >
                            <div className="adm-name">{p.product_name}</div>
                          </Link>

                          <div className="adm-sub">{p.product_id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Danh mục */}
                    <td className="text-center">
                      <div>{p.category_name || "—"}</div>
                    </td>

                    {/* Giá bán */}
                    <td className="text-end">
                      <div className="adm-price-cell">
                        <div className="fw-semibold">{fmtVND(p.price)}</div>

                        {p.original_price ? (
                          <div className="adm-original-price">
                            {fmtVND(p.original_price)}
                          </div>
                        ) : null}
                      </div>
                    </td>

                    {/* Stock */}
                    <td className="text-center">
                      <span
                        className={`adm-stock rounded-pill ${
                          (p.stock_quantity || 0) >= 200
                            ? "text-success bg-success-subtle"
                            : (p.stock_quantity || 0) >= 100
                              ? "text-warning bg-warning-subtle"
                              : "text-danger bg-danger-subtle"
                        }`}
                      >
                        {(p.stock_quantity || 0).toLocaleString("vi-VN")}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="text-center">
                      <span
                        className={`adm-status rounded-pill ${
                          effectiveStatus === "active"
                            ? "text-success bg-success-subtle"
                            : "text-danger bg-danger-subtle"
                        }`}
                      >
                        {effectiveStatus === "active" ? "Hoạt động" : "Đã khóa"}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="text-center">
                      <div className="d-flex gap-1 justify-content-center">
                        {/* Sửa */}
                        <Link
                          to={`/admin/san-pham/${p.product_id}/sua?returnUrl=${encodeURIComponent(
                            window.location.pathname + window.location.search,
                          )}`}
                          className="adm-action-btn"
                          title="Chỉnh sửa"
                          onClick={saveScrollPosition}
                        >
                          <i className="bi bi-pencil-square" />
                        </Link>

                        {/* Khoá / Mở khoá */}
                        <button
                          className={`adm-action-btn ${isLocked ? "unlock" : "lock"}`}
                          disabled={isUpdating}
                          title={
                            isLocked ? "Mở khóa sản phẩm" : "Khóa sản phẩm"
                          }
                          onClick={() => handleLock(p)}
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
        displayedCount={products.length}
        label="sản phẩm"
        onPageChange={(nextPage) => updateProductQuery({ page: nextPage })}
      />
    </>
  );
}

// frontend\src\pages\Admin\Categories\index.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import confirmLock from "../../../utils/confirmLock";
import {
  getAdminCategories,
  updateAdminCategoryStatus,
  exportCategoriesToExcel,
} from "../../../services/category.service";
import Pagination from "../../../components/common/Pagination";
import Loading from "../../../components/common/Loading";
import defaultImage from "../../../assets/images/default-product.png";
import { Helmet } from "react-helmet-async";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB") : "—";
const CATEGORIES_PER_PAGE = 12;

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "active", label: "Hoạt động" },
  { key: "inactive", label: "Đã khóa" },
];

const SORT_OPTIONS = [
  { key: "default", label: "Mặc định" },
  { key: "az", label: "Tên: A → Z" },
  { key: "za", label: "Tên: Z → A" },
  { key: "products_asc", label: "Số lượng SP: Ít → Nhiều" },
  { key: "products_desc", label: "Số lượng SP: Nhiều → Ít" },
];

export default function AdminCategories() {
  const saveScrollPosition = () => {
    sessionStorage.setItem("admin-categories-scroll", String(window.scrollY));
  };
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") || "";
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

  const [categories, setCategories] = useState([]);
  const [sortOpen, setSortOpen] = useState(false);
  const [updatingCategoryId, setUpdatingCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [searchValue, setSearchValue] = useState(q);
  const sortRef = useRef(null);
  const isComposing = useRef(false);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: CATEGORIES_PER_PAGE,
    total_items: 0,
    total_pages: 0,
  });

  const updateCategoryQuery = (changes, options = {}) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const shouldResetPage = ["q", "sort", "status"].some(
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

    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await getAdminCategories({
          q,
          sort,
          status,
          page,
          limit: CATEGORIES_PER_PAGE,
        });

        if (!isCurrentRequest) return;

        setCategories(res.data || []);
        setPagination(
          res.pagination
            ? {
                page: res.pagination.currentPage,
                limit: res.pagination.limit,
                total_items: res.pagination.totalItems,
                total_pages: res.pagination.totalPages,
              }
            : {
                page: 1,
                limit: CATEGORIES_PER_PAGE,
                total_items: 0,
                total_pages: 0,
              },
        );
      } catch (err) {
        if (!isCurrentRequest) return;

        console.error(err);
        setError(
          err.response?.data?.message || "Không thể tải danh sách danh mục!",
        );
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    };

    fetchCategories();

    return () => {
      isCurrentRequest = false;
    };
  }, [q, sort, status, page]);

  useEffect(() => {
    const savedScroll = sessionStorage.getItem("admin-categories-scroll");

    if (savedScroll !== null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, Number(savedScroll));
      });

      sessionStorage.removeItem("admin-categories-scroll");
    }
  }, []);

  // Reset only when the URL query changes; preserve the local typing draft.
  const [previousQuery, setPreviousQuery] = useState(q);
  if (previousQuery !== q) {
    setPreviousQuery(q);
    setSearchValue(q);
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
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
  const handleLock = async (category) => {
    if (updatingCategoryId) return;
    // Bao quát cả hai trường hợp "inactive" hoặc "archived" là đã bị khóa
    const isLocked =
      category.status === "inactive" || category.status === "archived";

    try {
      setUpdatingCategoryId(category.category_id);
      if (
        !isLocked &&
        !(await confirmLock(
          "Khóa danh mục",
          `Khóa danh mục "${category.name}"?`,
        ))
      )
        return;

      await updateAdminCategoryStatus(category.category_id);

      // Load lại danh sách theo filter + pagination hiện tại
      const res = await getAdminCategories({
        q,
        sort,
        status,
        page,
        limit: CATEGORIES_PER_PAGE,
      });

      setCategories(res.data || []);

      setPagination(
        res.pagination
          ? {
              page: res.pagination.currentPage,
              limit: res.pagination.limit,
              total_items: res.pagination.totalItems,
              total_pages: res.pagination.totalPages,
            }
          : {
              page: 1,
              limit: CATEGORIES_PER_PAGE,
              total_items: 0,
              total_pages: 0,
            },
      );

      toast.success(
        isLocked
          ? `Đã mở khóa "${category.name}"`
          : `Đã khóa "${category.name}"`,
      );
    } catch (err) {
      console.error(err);

      toast.error(
        err.response?.data?.message ||
          "Không thể cập nhật trạng thái danh mục!",
      );
    } finally {
      setUpdatingCategoryId("");
    }
  };

  /* ── export excel ── */
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      toast.info("Đang chuẩn bị xuất dữ liệu, vui lòng đợi...");

      const blob = await exportCategoriesToExcel();

      const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const filename = `categories_export_${dateStr}.xlsx`;

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

    updateCategoryQuery({
      q: "",
      sort: "",
      status: "",
      page: 1,
    });
  };

  return (
    <>
      <Helmet>
        <title>Quản lý danh mục | Selene</title>
      </Helmet>

      {/* ── PAGE HEADER ── */}
      <div className="adm-page-head">
        <div>
          <div className="adm-page-title">Danh mục</div>
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
            to="/admin/danh-muc/them-moi"
            className="form-btn btn btn-dark fw-semibold px-4"
          >
            <i className="bi bi-plus-lg me-1" /> Thêm danh mục
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
            placeholder="Tìm theo tên danh mục..."
            value={searchValue}
            onCompositionStart={() => {
              isComposing.current = true;
            }}
            onCompositionEnd={(e) => {
              isComposing.current = false;
              updateCategoryQuery({ q: e.target.value }, { replace: true });
            }}
            onChange={(e) => {
              const value = e.target.value;

              setSearchValue(value);

              if (!isComposing.current) {
                updateCategoryQuery({ q: value }, { replace: true });
              }
            }}
          />
        </div>

        {/* Filter: Sắp xếp */}
        <div className="dropdown" ref={sortRef}>
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
                      updateCategoryQuery({ sort: s.key });
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
              onClick={() => updateCategoryQuery({ status: t.key })}
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
              <th style={{ width: "25%" }}>Danh mục</th>
              <th className="text-center">Số lượng SP</th>
              <th className="text-center">Trạng thái</th>
              <th className="text-center">Ngày tạo</th>
              <th className="text-center"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-5">
                  <Loading text="Đang tải danh mục..." />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center text-danger fw-semibold py-5"
                  style={{ fontSize: 14 }}
                >
                  {error}
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="page-empty py-5">
                  <i className="bi bi-inbox page-empty-icon" />
                  <p
                    className="mt-3 mb-1 fw-semibold text-secondary"
                    style={{ fontSize: 16 }}
                  >
                    Không tìm thấy danh mục
                  </p>
                  <p className="text-muted mb-3" style={{ fontSize: 14 }}>
                    Thử lại với từ khóa hoặc bộ lọc khác!
                  </p>
                </td>
              </tr>
            ) : (
              categories.map((p, idx) => {
                const isLocked =
                  p.status === "inactive" || p.status === "archived";
                const isUpdating = updatingCategoryId === p.category_id;
                const effectiveStatus = p.status;

                const stt = (pagination.page - 1) * pagination.limit + idx + 1;

                return (
                  <tr key={p.category_id}>
                    {/* STT */}
                    <td className="text-center">
                      <span className="adm-stt">{stt}</span>
                    </td>

                    <td>
                      <div className="adm-cell">
                        <img
                          src={p.image_url || defaultImage}
                          alt=""
                          className="adm-thumb"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = defaultImage;
                          }}
                        />
                        <div className="adm-name">{p.name}</div>
                      </div>
                    </td>
                    <td className="text-center">{p.product_count || 0}</td>

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

                    <td className="text-center">{formatDate(p.created_at)}</td>

                    {/* Thao tác */}
                    <td className="text-center">
                      <div className="d-flex gap-1 justify-content-center">
                        {/* Sửa */}
                        <Link
                          to={`/admin/danh-muc/${p.category_id}/sua?returnUrl=${encodeURIComponent(
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
                            isLocked ? "Mở khóa danh mục" : "Khóa danh mục"
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
        displayedCount={categories.length}
        label="danh mục"
        onPageChange={(nextPage) => updateCategoryQuery({ page: nextPage })}
      />
    </>
  );
}

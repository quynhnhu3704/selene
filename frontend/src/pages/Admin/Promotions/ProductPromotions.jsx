// frontend/src/pages/Admin/Promotions/ProductPromotions.jsx
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";
import AdminSelect from "../components/AdminSelect";
import Pagination from "../../../components/common/Pagination";
import EmptyState from "../../../components/common/EmptyState";
import Loading from "../../../components/common/Loading";
import {
  PRODUCT_PROMOTION_FILTER_STATUSES,
  PRODUCT_SORT_OPTIONS,
  getProductPromotionStatus,
  fmtVND,
  formatDate,
} from "./mockData";
import {
  getAdminPromotions,
  updateAdminPromotionStatus,
} from "../../../services/promotion.service";

const ITEMS_PER_PAGE = 8;

const getAppliedProductCount = (item) => {
  if (typeof item.applied_products_count === "number") {
    return item.applied_products_count;
  }
  if (Array.isArray(item.promotion_items)) {
    return item.promotion_items.length;
  }
  if (Array.isArray(item.product_ids)) {
    return item.product_ids.length;
  }
  const text = item.description || item.scope || "";
  const match = text.match(/\((\d+)\s*(?:SP|sản phẩm)\)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  if (
    text.toLowerCase().includes("toàn bộ") ||
    text.toLowerCase().includes("tất cả")
  ) {
    return "Tất cả";
  }
  return 0;
};

export default function ProductPromotions() {
  const [promotions, setPromotions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: ITEMS_PER_PAGE,
    totalItems: 0,
    totalPages: 1,
  });

  const composing = useRef(false);

  // Restore scroll position when returning from edit page
  const saveScrollPosition = () => {
    sessionStorage.setItem("promotionsScrollY", String(window.scrollY));
  };

  useEffect(() => {
    const savedY = sessionStorage.getItem("promotionsScrollY");
    if (savedY) {
      window.scrollTo(0, parseInt(savedY, 10));
      sessionStorage.removeItem("promotionsScrollY");
    }
  }, [loading]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  // Fetch promotions from API (http://localhost:8000/api/products/manage/promotions)
  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminPromotions({
        page,
        limit: ITEMS_PER_PAGE,
        status: status || undefined,
        q: debouncedQ.trim() || undefined,
      });

      const list = res?.data || [];
      setPromotions(list);

      if (res?.pagination) {
        setPagination({
          currentPage: res.pagination.currentPage ?? page,
          limit: res.pagination.limit ?? ITEMS_PER_PAGE,
          totalItems: res.pagination.totalItems ?? list.length,
          totalPages:
            res.pagination.totalPages ??
            Math.max(1, Math.ceil(list.length / ITEMS_PER_PAGE)),
        });
      } else {
        setPagination({
          currentPage: page,
          limit: ITEMS_PER_PAGE,
          totalItems: list.length,
          totalPages: Math.max(1, Math.ceil(list.length / ITEMS_PER_PAGE)),
        });
      }

    } catch (err) {
      setPromotions([]);
      setPagination({ currentPage: page, limit: ITEMS_PER_PAGE, totalItems: 0, totalPages: 0 });
      toast.error(err.response?.data?.message || "Không thể tải danh sách khuyến mãi.");
    } finally {
      setLoading(false);
    }
  }, [page, status, debouncedQ]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  // Client-side sort on current page results
  const sortedPromotions = useMemo(() => {
    let result = [...promotions];

    if (sort === "newest") {
      result.sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
      );
    } else if (sort === "oldest") {
      result.sort(
        (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
      );
    } else if (sort === "usage_desc") {
      result.sort(
        (a, b) => (Number(b.used_quantity) || 0) - (Number(a.used_quantity) || 0),
      );
    } else if (sort === "discount_desc") {
      result.sort(
        (a, b) =>
          (Number(b.discount_value) || 0) - (Number(a.discount_value) || 0),
      );
    } else if (sort === "discount_asc") {
      result.sort(
        (a, b) =>
          (Number(a.discount_value) || 0) - (Number(b.discount_value) || 0),
      );
    } else if (sort === "az") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"));
    }

    return result;
  }, [promotions, sort]);

  const handleReset = () => {
    setQ("");
    setDebouncedQ("");
    setStatus("");
    setSort("default");
    setPage(1);
  };

  const handleToggleLock = async (item) => {
    const promoId = item.promotion_id || item.id;
    const isPaused = item.status === "inactive" || item.status === "paused";
    const nextStatus = isPaused ? "active" : "inactive";

    try {
      await updateAdminPromotionStatus(promoId, nextStatus);
      toast.success(
        nextStatus === "inactive"
          ? `Đã dừng hoạt động khuyến mãi "${item.name}"`
          : `Đã kích hoạt khuyến mãi "${item.name}"`,
      );
      fetchPromotions();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          "Không thể thay đổi trạng thái khuyến mãi. Vui lòng thử lại!",
      );
    }
  };

  const totalItems = pagination.totalItems || sortedPromotions.length;
  const totalPages = pagination.totalPages || 1;

  return (
    <>
      <Helmet>
        <title>Khuyến mãi sản phẩm | Selene</title>
      </Helmet>

      {/* ── PAGE HEADER ── */}
      <div className="adm-page-head">
        <div className="adm-page-title">Khuyến mãi sản phẩm</div>
        <div className="d-flex gap-2 flex-wrap">
          <Link
            to="/admin/khuyen-mai/san-pham/them-moi"
            className="form-btn btn btn-dark fw-semibold px-4"
          >
            <i className="bi bi-plus-lg me-2" />
            Thêm khuyến mãi
          </Link>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="adm-toolbar">
        <div className="adm-toolbar-search">
          <i className="bi bi-search" />
          <input
            className="form-control"
            aria-label="Tìm theo mã hoặc tên chương trình"
            placeholder="Tìm theo mã hoặc tên chương trình..."
            value={q}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(e) => {
              composing.current = false;
              setQ(e.target.value);
            }}
            onChange={(e) => {
              setQ(e.target.value);
            }}
          />
        </div>

        <AdminSelect
          icon="bi-funnel"
          aria-label="Lọc trạng thái khuyến mãi"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {PRODUCT_PROMOTION_FILTER_STATUSES.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </AdminSelect>

        <AdminSelect
          icon="bi-sort-down"
          aria-label="Sắp xếp khuyến mãi"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
          }}
        >
          {PRODUCT_SORT_OPTIONS.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </AdminSelect>

        <button
          type="reset"
          className="form-btn btn btn-outline-dark fw-semibold mb-0 px-4"
          onClick={handleReset}
        >
          <i className="bi bi-arrow-counterclockwise me-1" /> Đặt lại
        </button>
      </div>

      {/* ── TABLE ── */}
      <div className="adm-table-wrap table-responsive overflow-x-auto">
        <table className="table adm-table mb-0" style={{ minWidth: 1100 }}>
          <thead>
            <tr>
              <th className="text-center" style={{ width: "4%" }} />
              <th style={{ width: "22%" }}>Mã khuyến mãi</th>
              <th style={{ width: "25%" }}>
                Chương trình khuyến mãi
              </th>
              <th className="text-center" style={{ width: "9%" }}>
                SP áp dụng
              </th>
              <th className="text-center" style={{ width: "9%" }}>
                Lượt dùng
              </th>
              <th className="text-center" style={{ width: "13%" }}>
                Trạng thái
              </th>
              <th className="text-center" style={{ width: "10%" }}>
                Thời gian
              </th>
              <th className="text-center" style={{ width: "8%" }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-5">
                  <Loading text="Đang tải danh sách khuyến mãi..." />
                </td>
              </tr>
            ) : !sortedPromotions.length ? (
              <tr>
                <td colSpan={8} className="page-empty py-5">
                  <EmptyState text="Không có chương trình khuyến mãi nào để hiển thị" />
                </td>
              </tr>
            ) : (
              sortedPromotions.map((item, index) => {
                const state = getProductPromotionStatus(item.status);
                const promoCode = item.promotion_id || item.code || item.id;
                const isPaused =
                  item.status === "inactive" || item.status === "paused";
                const stt = (page - 1) * ITEMS_PER_PAGE + index + 1;
                const usedQty = item.used_quantity ?? 0;
                const totalQty =
                  Number(item.quantity_limit) > 0 ? item.quantity_limit : "∞";
                const appliedCount = getAppliedProductCount(item);
                const editUrl = `/admin/khuyen-mai/san-pham/${encodeURIComponent(
                  promoCode,
                )}/sua?returnUrl=${encodeURIComponent(
                  window.location.pathname + window.location.search,
                )}`;

                return (
                  <tr key={promoCode || index}>
                    <td className="text-center">
                      <span className="adm-stt">{stt}</span>
                    </td>
                    <td>
                      <Link
                        to={editUrl}
                        className="adm-link adm-name text-break"
                        onClick={saveScrollPosition}
                        title="Bấm để chỉnh sửa"
                      >
                        {promoCode}
                      </Link>
                    </td>
                    <td>
                      <Link
                        to={editUrl}
                        className="adm-link adm-name text-break"
                        onClick={saveScrollPosition}
                        title="Bấm để chỉnh sửa"
                      >
                        {item.name || promoCode}
                      </Link>
                      {(item.description || item.scope) && (
                        <div
                          className="adm-sub text-break mt-1"
                        >
                          {item.description || item.scope}
                        </div>
                      )}
                    </td>
                    <td className="text-center text-nowrap">
                      {appliedCount === "Tất cả" ? (
                        <span className="badge bg-secondary-subtle text-secondary fw-semibold">
                          Tất cả SP
                        </span>
                      ) : (
                        <span className="fw-semibold text-dark">
                          {appliedCount}{" "}
                          <span className="text-muted small fw-normal">SP</span>
                        </span>
                      )}
                    </td>
                    <td className="text-center text-nowrap">
                      <span className="fw-semibold text-dark">{usedQty}</span>{" "}
                      <span className="text-muted">/ {totalQty}</span>
                      {Number(item.quantity_limit) === 0 && (
                        <div
                          className="adm-sub"
                        >
                          Không giới hạn
                        </div>
                      )}
                    </td>
                    <td className="text-center text-nowrap">
                      <span
                        className={`adm-status adm-status-wide rounded-pill text-${state.color} bg-${state.color}-subtle`}
                      >
                        {state.label}
                      </span>
                    </td>
                    <td
                      className="text-center text-nowrap"
                    >
                      <div className="fw-medium">
                        {formatDate(item.start_date)}
                      </div>
                      <div className="text-muted">
                        đến {formatDate(item.end_date)}
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="d-flex gap-2 justify-content-center">
                        <Link
                          to={editUrl}
                          className="adm-action-btn"
                          title="Chỉnh sửa"
                          aria-label={`Sửa ${item.name}`}
                          onClick={saveScrollPosition}
                        >
                          <i className="bi bi-pencil-square" />
                        </Link>
                        <button
                          type="button"
                          className={`adm-action-btn ${
                            isPaused ? "unlock" : "lock"
                          }`}
                          title={
                            isPaused
                              ? "Kích hoạt khuyến mãi"
                              : "Dừng hoạt động khuyến mãi"
                          }
                          onClick={() => handleToggleLock(item)}
                        >
                          <i
                            className={`bi ${
                              isPaused ? "bi-unlock" : "bi-lock"
                            }`}
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
      {!loading && totalItems > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          displayedCount={sortedPromotions.length}
          label="khuyến mãi"
          onPageChange={(nextPage) => setPage(nextPage)}
        />
      )}
    </>
  );
}

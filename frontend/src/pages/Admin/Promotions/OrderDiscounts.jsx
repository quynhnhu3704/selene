// frontend/src/pages/Admin/Promotions/OrderDiscounts.jsx
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";
import AdminSelect from "../components/AdminSelect";
import Pagination from "../../../components/common/Pagination";
import EmptyState from "../../../components/common/EmptyState";
import Loading from "../../../components/common/Loading";
import {
  INITIAL_ORDER_DISCOUNTS,
  ORDER_DISCOUNT_STATUSES,
  ORDER_SORT_OPTIONS,
  getOrderDiscountStatus,
  fmtVND,
  formatDate,
} from "./mockData";
import {
  getAdminVouchers,
  updateAdminVoucher,
  updateAdminVoucherStatus,
} from "../../../services/voucher.service";

const ITEMS_PER_PAGE = 8;

const formatK = (val) => {
  if (!val || Number(val) === 0) return "0đ";
  const num = Number(val);
  if (num >= 1000 && num % 1000 === 0) {
    return `${(num / 1000).toLocaleString("vi-VN")}k`;
  }
  return fmtVND(num);
};

const getVoucherDescription = (item) => {
  if (item.description) return item.description;

  const isPercent =
    item.discount_type === "percentage" || item.discount_type === "percent";
  const isFreeShip = item.discount_type === "free_shipping";
  const minOrder = item.min_order_value ?? item.min_order ?? 0;
  const maxDiscount = item.max_discount_amount ?? 0;

  let text = "";
  if (isPercent) {
    text = `Giảm ${item.discount_value}%`;
    if (Number(maxDiscount) > 0) {
      text += ` tối đa ${formatK(maxDiscount)}`;
    }
  } else if (isFreeShip) {
    text = "Miễn phí vận chuyển";
    if (Number(item.discount_value) > 0) {
      text += ` tối đa ${formatK(item.discount_value)}`;
    }
  } else {
    text = `Giảm ${fmtVND(item.discount_value)}`;
  }

  if (Number(minOrder) > 0) {
    text += ` cho đơn từ ${formatK(minOrder)}`;
  }

  return text || "—";
};

export default function OrderDiscounts() {
  const [discounts, setDiscounts] = useState(() => {
    const saved = localStorage.getItem("selene_mock_order_discounts");
    return saved ? JSON.parse(saved) : INITIAL_ORDER_DISCOUNTS;
  });

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);

  const composing = useRef(false);

  // Restore scroll position when returning from edit page
  const saveScrollPosition = () => {
    sessionStorage.setItem("discountsScrollY", String(window.scrollY));
  };

  useEffect(() => {
    const savedY = sessionStorage.getItem("discountsScrollY");
    if (savedY) {
      window.scrollTo(0, parseInt(savedY, 10));
      sessionStorage.removeItem("discountsScrollY");
    }
  }, [loading]);

  // Fetch vouchers from API
  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminVouchers({ page: 1, limit: 100 });
      const apiVouchers = res?.data || [];
      if (Array.isArray(apiVouchers) && apiVouchers.length > 0) {
        setDiscounts(apiVouchers);
        try {
          localStorage.setItem(
            "selene_mock_order_discounts",
            JSON.stringify(apiVouchers),
          );
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.warn("Không thể tải danh sách voucher từ server, sử dụng dữ liệu cục bộ:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const saveToStorage = (updated) => {
    setDiscounts(updated);
    try {
      localStorage.setItem("selene_mock_order_discounts", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  // Filter & Sort
  const filteredDiscounts = useMemo(() => {
    let result = [...discounts];

    if (q.trim()) {
      const keyword = q.toLowerCase().trim();
      result = result.filter(
        (item) =>
          (item.code || "").toLowerCase().includes(keyword) ||
          (item.name || "").toLowerCase().includes(keyword),
      );
    }

    if (status) {
      result = result.filter((item) => {
        if (status === "out_of_stock") {
          return item.status === "out_of_stock" || item.status === "depleted";
        }
        if (status === "inactive") {
          return item.status === "inactive" || item.status === "locked";
        }
        return item.status === status;
      });
    }

    if (sort === "newest") {
      result.sort((a, b) => new Date(b.created_at || b.start_date || 0) - new Date(a.created_at || a.start_date || 0));
    } else if (sort === "oldest") {
      result.sort((a, b) => new Date(a.created_at || a.start_date || 0) - new Date(b.created_at || b.start_date || 0));
    } else if (sort === "discount_desc") {
      result.sort((a, b) => Number(b.discount_value || 0) - Number(a.discount_value || 0));
    } else if (sort === "usage_desc") {
      result.sort((a, b) => Number(b.used_quantity ?? b.used_count ?? 0) - Number(a.used_quantity ?? a.used_count ?? 0));
    } else if (sort === "az") {
      result.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
    }

    return result;
  }, [discounts, q, status, sort]);

  // Pagination calculation
  const totalItems = filteredDiscounts.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const paginatedDiscounts = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredDiscounts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDiscounts, page]);

  const handleReset = () => {
    setQ("");
    setStatus("");
    setSort("default");
    setPage(1);
  };

  const handleToggleLock = async (item) => {
    const voucherId = item.voucher_id || item.id;
    const isInactive = item.status === "inactive" || item.status === "locked";
    const nextStatus = isInactive ? "active" : "inactive";

    try {
      await updateAdminVoucherStatus(voucherId, nextStatus);
    } catch (err) {
      console.warn("API update status failed, saving locally:", err.message);
    }

    const updated = discounts.map((p) =>
      (p.voucher_id || p.id) === voucherId ? { ...p, status: nextStatus } : p,
    );
    saveToStorage(updated);
    toast.info(
      nextStatus === "inactive"
        ? `Đã dừng hoạt động mã "${item.code}"`
        : `Đã mở hoạt động lại mã "${item.code}"`,
    );
  };

  return (
    <>
      <Helmet>
        <title>Mã giảm giá đơn hàng | Selene</title>
      </Helmet>

      {/* ── PAGE HEADER ── */}
      <div className="adm-page-head">
        <div className="adm-page-title">Mã giảm giá đơn hàng</div>
        <div className="d-flex gap-2 flex-wrap">
          <Link
            to="/admin/khuyen-mai/ma-giam-gia/them-moi"
            className="form-btn btn btn-dark fw-semibold px-4"
          >
            <i className="bi bi-plus-lg me-2" />
            Thêm mã giảm giá
          </Link>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="adm-toolbar">
        <div className="adm-toolbar-search">
          <i className="bi bi-search" />
          <input
            className="form-control"
            aria-label="Tìm theo mã voucher hoặc tên ưu đãi"
            placeholder="Tìm theo mã voucher hoặc tên ưu đãi..."
            value={q}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(e) => {
              composing.current = false;
              setQ(e.target.value);
              setPage(1);
            }}
            onChange={(e) => {
              setQ(e.target.value);
              if (!composing.current) setPage(1);
            }}
          />
        </div>

        <AdminSelect
          icon="bi-funnel"
          aria-label="Lọc trạng thái mã giảm giá"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {ORDER_DISCOUNT_STATUSES.filter(
            (v, i, a) => a.findIndex((t) => t.key === v.key) === i,
          ).map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </AdminSelect>

        <AdminSelect
          icon="bi-sort-down"
          aria-label="Sắp xếp mã giảm giá"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          {ORDER_SORT_OPTIONS.map((item) => (
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
      {loading ? (
        <div className="text-center py-5">
          <Loading text="Đang tải danh sách mã giảm giá..." />
        </div>
      ) : (
        <div className="adm-table-wrap table-responsive overflow-x-auto">
          <table className="table adm-table mb-0" style={{ minWidth: 1050 }}>
            <thead>
              <tr>
                <th className="text-center" style={{ width: "4%" }}>#</th>
                <th style={{ width: "12%" }}>Mã giảm giá</th>
                <th style={{ width: "18%" }}>Tên mã</th>
                <th style={{ width: "27%" }}>Áp dụng</th>
                <th className="text-center" style={{ width: "12%" }}>Lượt dùng</th>
                <th className="text-center" style={{ width: "12%" }}>Trạng thái</th>
                <th className="text-center" style={{ width: "15%" }}>Thời hạn</th>
                <th className="text-center" style={{ width: "6%" }}></th>
              </tr>
            </thead>
            <tbody>
              {!paginatedDiscounts.length ? (
                <tr>
                  <td colSpan={8} className="page-empty py-5">
                    <EmptyState text="Không có mã giảm giá nào để hiển thị" />
                  </td>
                </tr>
              ) : (
                paginatedDiscounts.map((item, index) => {
                  const state = getOrderDiscountStatus(item.status);
                  const stt = (page - 1) * ITEMS_PER_PAGE + index + 1;
                  const usedQty = item.used_quantity ?? item.used_count ?? 0;
                  const totalQty = item.total_quantity ?? item.max_usage ?? "—";

                  const voucherKey = item.voucher_id || item.id;
                  const editUrl = `/admin/khuyen-mai/ma-giam-gia/${voucherKey}/sua?returnUrl=${encodeURIComponent(
                    window.location.pathname + window.location.search,
                  )}`;

                  return (
                    <tr key={voucherKey || item.code}>
                      <td className="text-center">
                        <span className="adm-stt">{stt}</span>
                      </td>
                      <td>
                        <Link
                          to={editUrl}
                          className="adm-name text-break fw-bold text-decoration-none"
                          style={{ color: "#17151F" }}
                          title="Bấm để chỉnh sửa"
                          onClick={saveScrollPosition}
                        >
                          <span
                            className="font-monospace text-dark fw-bold"
                            style={{ fontSize: 15, letterSpacing: "0.5px" }}
                          >
                            {item.code}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={editUrl}
                          className="adm-name text-break text-decoration-none text-dark fw-semibold"
                          title="Bấm để chỉnh sửa"
                          onClick={saveScrollPosition}
                        >
                          {item.name || item.code}
                        </Link>
                      </td>
                      <td>
                        <div className="fw-medium text-dark text-break">
                          {getVoucherDescription(item)}
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="fw-semibold text-dark">
                          {usedQty} / {totalQty}
                        </span>
                        {item.per_user_limit ? (
                          <div className="text-muted small" style={{ fontSize: 11.5 }}>
                            Tối đa {item.per_user_limit} lần/khách
                          </div>
                        ) : null}
                      </td>
                      <td className="text-center">
                        <span
                          className={`adm-status rounded-pill text-${state.color} bg-${state.color}-subtle`}
                          style={{ minWidth: "7.5rem", display: "inline-block" }}
                        >
                          {state.label}
                        </span>
                      </td>
                      <td className="text-center text-nowrap" style={{ fontSize: 13 }}>
                        <div>{formatDate(item.start_date)}</div>
                        <div className="text-muted" style={{ fontSize: 11.5 }}>
                          đến {formatDate(item.end_date)}
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="d-flex gap-2 justify-content-center">
                          <Link
                            to={editUrl}
                            className="adm-action-btn"
                            title="Chỉnh sửa"
                            aria-label={`Sửa ${item.code}`}
                            onClick={saveScrollPosition}
                          >
                            <i className="bi bi-pencil-square" />
                          </Link>
                          <button
                            type="button"
                            className={`adm-action-btn ${item.status === "inactive" || item.status === "locked" ? "unlock" : "lock"}`}
                            title={
                              item.status === "inactive" || item.status === "locked"
                                ? "Mở hoạt động lại"
                                : "Dừng hoạt động"
                            }
                            onClick={() => handleToggleLock(item)}
                          >
                            <i
                              className={`bi ${
                                item.status === "inactive" || item.status === "locked"
                                  ? "bi-unlock"
                                  : "bi-lock"
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
      )}

      {/* ── PAGINATION ── */}
      {totalItems > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          displayedCount={paginatedDiscounts.length}
          label="mã giảm giá"
          onPageChange={(nextPage) => setPage(nextPage)}
        />
      )}
    </>
  );
}

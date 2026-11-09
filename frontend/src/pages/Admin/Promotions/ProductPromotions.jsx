// frontend/src/pages/Admin/Promotions/ProductPromotions.jsx
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
  createAdminPromotion,
  updateAdminPromotion,
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
  const [promotions, setPromotions] = useState(() => {
    const saved = localStorage.getItem("selene_mock_product_promotions");
    return saved ? JSON.parse(saved) : [];
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    quantity_limit: 0,
    status: "active",
    start_date: "",
    end_date: "",
  });

  const composing = useRef(false);

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
          totalPages: res.pagination.totalPages ?? Math.max(1, Math.ceil(list.length / ITEMS_PER_PAGE)),
        });
      } else {
        setPagination({
          currentPage: page,
          limit: ITEMS_PER_PAGE,
          totalItems: list.length,
          totalPages: Math.max(1, Math.ceil(list.length / ITEMS_PER_PAGE)),
        });
      }

      try {
        localStorage.setItem(
          "selene_mock_product_promotions",
          JSON.stringify(list),
        );
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.warn("Không thể tải danh sách khuyến mãi từ server:", err.message);
      // Fallback to local storage if API call fails
      const saved = localStorage.getItem("selene_mock_product_promotions");
      if (saved) {
        try {
          const fallbackList = JSON.parse(saved);
          setPromotions(fallbackList);
          setPagination({
            currentPage: 1,
            limit: ITEMS_PER_PAGE,
            totalItems: fallbackList.length,
            totalPages: Math.max(1, Math.ceil(fallbackList.length / ITEMS_PER_PAGE)),
          });
        } catch {
          /* ignore */
        }
      }
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
      result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sort === "oldest") {
      result.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (sort === "usage_desc") {
      result.sort((a, b) => (Number(b.used_quantity) || 0) - (Number(a.used_quantity) || 0));
    } else if (sort === "discount_desc") {
      result.sort((a, b) => (Number(b.discount_value) || 0) - (Number(a.discount_value) || 0));
    } else if (sort === "discount_asc") {
      result.sort((a, b) => (Number(a.discount_value) || 0) - (Number(b.discount_value) || 0));
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

  const handleOpenAdd = () => {
    setEditingItem(null);
    const today = new Date().toISOString().slice(0, 10);
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    setFormData({
      code: "",
      name: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      quantity_limit: 0,
      status: "active",
      start_date: today,
      end_date: future,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      code: item.promotion_id || item.code || item.id || "",
      name: item.name || "",
      description: item.description || item.scope || "",
      discount_type:
        item.discount_type === "percent" || item.discount_type === "percentage"
          ? "percentage"
          : "fixed_amount",
      discount_value: item.discount_value ?? "",
      quantity_limit: item.quantity_limit ?? 0,
      status: item.status || "active",
      start_date: item.start_date ? item.start_date.slice(0, 10) : "",
      end_date: item.end_date ? item.end_date.slice(0, 10) : "",
    });
    setShowModal(true);
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning("Vui lòng nhập tên chương trình khuyến mãi!");
      return;
    }
    const numValue = Number(formData.discount_value);
    if (!formData.discount_value || isNaN(numValue) || numValue <= 0) {
      toast.warning("Mức giảm phải lớn hơn 0!");
      return;
    }
    if (formData.discount_type === "percentage" && numValue > 100) {
      toast.warning("Giảm giá theo phần trăm không được vượt quá 100%!");
      return;
    }
    if (!formData.start_date) {
      toast.warning("Vui lòng chọn ngày bắt đầu!");
      return;
    }
    if (!formData.end_date) {
      toast.warning("Vui lòng chọn ngày kết thúc!");
      return;
    }
    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      toast.warning("Thời gian kết thúc phải lớn hơn thời gian bắt đầu!");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        discount_type: formData.discount_type,
        discount_value: numValue,
        quantity_limit: Math.max(0, parseInt(formData.quantity_limit, 10) || 0),
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date + "T23:59:59").toISOString(),
        status: formData.status || "active",
      };

      if (editingItem) {
        const promoId = editingItem.promotion_id || editingItem.id;
        await updateAdminPromotion(promoId, payload);
        toast.success("Cập nhật khuyến mãi thành công!");
      } else {
        await createAdminPromotion(payload);
        toast.success("Tạo mới chương trình khuyến mãi thành công!");
      }

      setShowModal(false);
      fetchPromotions();
    } catch (err) {
      console.error("Lỗi khi lưu khuyến mãi:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Có lỗi xảy ra, vui lòng thử lại!";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
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
          <button
            type="button"
            className="form-btn btn btn-dark fw-semibold px-4"
            onClick={handleOpenAdd}
          >
            <i className="bi bi-plus-lg me-2" />
            Thêm khuyến mãi
          </button>
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
              <th className="text-center" style={{ width: "4%" }}>#</th>
              <th style={{ width: "22%" }}>Mã khuyến mãi</th>
              <th style={{ width: "25%", paddingLeft: "30px" }}>Chương trình khuyến mãi</th>
              <th className="text-center" style={{ width: "9%" }}>SP áp dụng</th>
              <th className="text-center" style={{ width: "9%" }}>Lượt dùng</th>
              <th className="text-center" style={{ width: "13%" }}>Trạng thái</th>
              <th className="text-center" style={{ width: "10%" }}>Thời gian</th>
              <th className="text-center" style={{ width: "8%" }}>Thao tác</th>
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

                return (
                  <tr key={promoCode || index}>
                    <td className="text-center">
                      <span className="adm-stt">{stt}</span>
                    </td>
                    <td>
                      <div
                        className="font-monospace fw-semibold text-nowrap"
                        style={{
                          cursor: "pointer",
                          color: "#17151F",
                          fontSize: 13.5,
                          letterSpacing: "0.2px",
                        }}
                        onClick={() => handleOpenEdit(item)}
                        title="Bấm để chỉnh sửa"
                      >
                        {promoCode}
                      </div>
                    </td>
                    <td style={{ paddingLeft: "30px" }}>
                      <div
                        className="fw-bold text-dark text-break"
                        style={{ cursor: "pointer", fontSize: 13.5 }}
                        onClick={() => handleOpenEdit(item)}
                        title="Bấm để chỉnh sửa"
                      >
                        {item.name || promoCode}
                      </div>
                      {(item.description || item.scope) && (
                        <div
                          className="text-muted text-break mt-1"
                          style={{ fontSize: 12.5, lineHeight: 1.4 }}
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
                      <span className="fw-semibold text-dark">
                        {usedQty}
                      </span>{" "}
                      <span className="text-muted">/ {totalQty}</span>
                      {Number(item.quantity_limit) === 0 && (
                        <div className="text-muted small" style={{ fontSize: 11 }}>
                          Không giới hạn
                        </div>
                      )}
                    </td>
                    <td className="text-center text-nowrap">
                      <span
                        className={`adm-status rounded-pill text-${state.color} bg-${state.color}-subtle`}
                        style={{ minWidth: "9.2rem", display: "inline-block", padding: "3px 8px" }}
                      >
                        {state.label}
                      </span>
                    </td>
                    <td className="text-center text-nowrap" style={{ fontSize: 13 }}>
                      <div className="fw-medium">{formatDate(item.start_date)}</div>
                      <div className="text-muted" style={{ fontSize: 11.5 }}>
                        đến {formatDate(item.end_date)}
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="d-flex gap-2 justify-content-center">
                        <button
                          type="button"
                          className="adm-action-btn"
                          title="Chỉnh sửa"
                          aria-label={`Sửa ${item.name}`}
                          onClick={() => handleOpenEdit(item)}
                        >
                          <i className="bi bi-pencil-square" />
                        </button>
                        <button
                          type="button"
                          className={`adm-action-btn ${isPaused ? "unlock" : "lock"}`}
                          title={isPaused ? "Kích hoạt khuyến mãi" : "Dừng hoạt động khuyến mãi"}
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

      {/* ── MODAL ADD / EDIT ── */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.45)", zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold">
                  {editingItem ? "Chỉnh sửa khuyến mãi" : "Thêm khuyến mãi mới"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                />
              </div>
              <form onSubmit={handleSaveModal}>
                <div className="modal-body pt-3">
                  {editingItem && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Mã khuyến mãi</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.code}
                        disabled
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Tên chương trình khuyến mãi <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: Ưu đãi BST Mùa Hè Rực Rỡ"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Mô tả / Phạm vi áp dụng</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: Toàn bộ sản phẩm hoặc Áo khoác & Hoodie"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold">Loại giảm giá</label>
                      <select
                        className="form-select"
                        value={formData.discount_type}
                        onChange={(e) =>
                          setFormData({ ...formData, discount_type: e.target.value })
                        }
                      >
                        <option value="percentage">Phần trăm (%)</option>
                        <option value="fixed_amount">Số tiền trực tiếp (VNĐ)</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold">
                        Mức giảm <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        max={formData.discount_type === "percentage" ? "100" : undefined}
                        placeholder={formData.discount_type === "percentage" ? "VD: 20 (%)" : "VD: 50000 (đ)"}
                        value={formData.discount_value}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discount_value: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Giới hạn số lượt dùng (0 = không giới hạn)
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      value={formData.quantity_limit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity_limit: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold">
                        Ngày bắt đầu <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.start_date}
                        onChange={(e) =>
                          setFormData({ ...formData, start_date: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold">
                        Ngày kết thúc <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.end_date}
                        onChange={(e) =>
                          setFormData({ ...formData, end_date: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label fw-semibold">Trạng thái</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <option value="active">Đang hoạt động</option>
                      <option value="inactive">Dừng hoạt động</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer border-top-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-4 fw-semibold"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn-dark px-4 fw-semibold"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Đang lưu...
                      </>
                    ) : editingItem ? (
                      "Lưu thay đổi"
                    ) : (
                      "Tạo khuyến mãi"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

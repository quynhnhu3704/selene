// frontend/src/pages/Admin/Promotions/OrderDiscounts.jsx
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
  createAdminVoucher,
  updateAdminVoucher,
} from "../../../services/voucher.service";

const ITEMS_PER_PAGE = 8;

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    discount_type: "percentage",
    discount_value: 20,
    min_order_value: 200000,
    max_discount_amount: 50000,
    total_quantity: 100,
    per_user_limit: 10,
    status: "active",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });

  const composing = useRef(false);

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

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      code: `GIAM${Math.floor(20 + Math.random() * 80)}K`,
      name: "",
      discount_type: "percentage",
      discount_value: 20,
      min_order_value: 200000,
      max_discount_amount: 50000,
      total_quantity: 100,
      per_user_limit: 10,
      status: "active",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      code: item.code || "",
      name: item.name || "",
      discount_type:
        item.discount_type === "percent"
          ? "percentage"
          : item.discount_type === "fixed"
            ? "fixed_amount"
            : item.discount_type || "percentage",
      discount_value: item.discount_value ?? 0,
      min_order_value: item.min_order_value ?? item.min_order ?? 0,
      max_discount_amount: item.max_discount_amount ?? 0,
      total_quantity: item.total_quantity ?? item.max_usage ?? 100,
      per_user_limit: item.per_user_limit ?? 1,
      status: item.status || "active",
      start_date: item.start_date ? new Date(item.start_date).toISOString().slice(0, 10) : "",
      end_date: item.end_date ? new Date(item.end_date).toISOString().slice(0, 10) : "",
    });
    setShowModal(true);
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast.warning("Vui lòng nhập mã voucher!");
      return;
    }
    if (!formData.name.trim()) {
      toast.warning("Vui lòng nhập tên chương trình giảm giá!");
      return;
    }
    if (formData.discount_value <= 0) {
      toast.warning("Mức giảm phải lớn hơn 0!");
      return;
    }

    const payload = {
      code: formData.code.toUpperCase().trim(),
      name: formData.name.trim(),
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value),
      min_order_value: Number(formData.min_order_value),
      max_discount_amount:
        formData.discount_type === "percentage"
          ? Number(formData.max_discount_amount || 0)
          : 0,
      total_quantity: Number(formData.total_quantity),
      per_user_limit: Number(formData.per_user_limit || 1),
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(`${formData.end_date}T23:59:59Z`).toISOString(),
      status: formData.status,
    };

    setIsSubmitting(true);
    try {
      if (editingItem) {
        const voucherId = editingItem.voucher_id || editingItem.id;
        try {
          await updateAdminVoucher(voucherId, payload);
        } catch (apiErr) {
          console.warn("API update failed, saving locally:", apiErr.message);
        }

        const updated = discounts.map((item) =>
          (item.voucher_id || item.id) === voucherId
            ? {
                ...item,
                ...payload,
                min_order: payload.min_order_value,
                max_usage: payload.total_quantity,
              }
            : item,
        );
        saveToStorage(updated);
        toast.success("Cập nhật mã giảm giá thành công!");
      } else {
        let createdVoucher = null;
        try {
          const res = await createAdminVoucher({
            ...payload,
            used_quantity: 0,
          });
          createdVoucher = res?.data;
        } catch (apiErr) {
          console.warn("API create failed, saving locally:", apiErr.message);
        }

        const newItem = createdVoucher || {
          voucher_id: `voucher-${Date.now()}`,
          id: `VC${Date.now().toString().slice(-4)}`,
          ...payload,
          min_order: payload.min_order_value,
          max_usage: payload.total_quantity,
          used_quantity: 0,
          used_count: 0,
          created_at: new Date().toISOString(),
        };

        saveToStorage([newItem, ...discounts]);
        toast.success("Thêm mã giảm giá mới thành công!");
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Đã xảy ra lỗi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLock = async (item) => {
    const voucherId = item.voucher_id || item.id;
    const nextStatus = item.status === "locked" ? "active" : "locked";

    try {
      await updateAdminVoucher(voucherId, { status: nextStatus });
    } catch (err) {
      console.warn("API update status failed, saving locally:", err.message);
    }

    const updated = discounts.map((p) =>
      (p.voucher_id || p.id) === voucherId ? { ...p, status: nextStatus } : p,
    );
    saveToStorage(updated);
    toast.info(
      nextStatus === "locked"
        ? `Đã tạm khóa mã "${item.code}"`
        : `Đã mở kích hoạt lại mã "${item.code}"`,
    );
  };

  return (
    <>
      <Helmet>
        <title>Mã giảm giá đơn hàng | Selene</title>
      </Helmet>

      {/* ── PAGE HEADER ── */}
      <div className="adm-page-head">
        <div>
          <div className="adm-page-title">Mã giảm giá đơn hàng</div>
          <div className="text-muted small">
            Quản lý danh sách voucher, thêm mới và thiết lập khuyến mãi toàn sàn
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="form-btn btn btn-outline-dark fw-semibold px-3"
            onClick={fetchVouchers}
            title="Làm mới dữ liệu từ máy chủ"
            disabled={loading}
          >
            <i className={`bi bi-arrow-clockwise me-1 ${loading ? "spin" : ""}`} />
            Làm mới
          </button>
          <button
            type="button"
            className="form-btn btn btn-dark fw-semibold px-4"
            onClick={handleOpenAdd}
          >
            <i className="bi bi-plus-lg me-2" />
            Thêm mã giảm giá
          </button>
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
                <th style={{ width: "11%" }}>Mã giảm giá</th>
                <th style={{ width: "25%" }}>Áp dụng</th>
                <th className="text-center" style={{ width: "12%" }}>Mức giảm</th>
                <th className="text-center" style={{ width: "11%" }}>Lượt sử dụng</th>
                <th className="text-center" style={{ width: "14%" }}>Trạng thái</th>
                <th className="text-center" style={{ width: "16%" }}>Thời hạn</th>
                <th className="text-center" style={{ width: "7%" }}></th>
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
                  const minOrder = item.min_order_value ?? item.min_order ?? 0;
                  const usedQty = item.used_quantity ?? item.used_count ?? 0;
                  const totalQty = item.total_quantity ?? item.max_usage ?? "—";
                  const isPercent =
                    item.discount_type === "percentage" ||
                    item.discount_type === "percent";
                  const isFreeShip = item.discount_type === "free_shipping";

                  return (
                    <tr key={item.voucher_id || item.id || item.code}>
                      <td className="text-center">
                        <span className="adm-stt">{stt}</span>
                      </td>
                      <td>
                        <div
                          className="adm-name text-break fw-bold"
                          style={{ cursor: "pointer", color: "#17151F" }}
                          onClick={() => handleOpenEdit(item)}
                          title="Bấm để chỉnh sửa"
                        >
                          <span
                            className="font-monospace text-dark fw-bold"
                            style={{ fontSize: 16, letterSpacing: "0.5px" }}
                          >
                            {item.code}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div
                          className="adm-name text-break"
                          style={{ cursor: "pointer" }}
                          onClick={() => handleOpenEdit(item)}
                          title="Bấm để chỉnh sửa"
                        >
                          {item.name || `Đơn từ ${fmtVND(minOrder)}`}
                        </div>
                        <div className="adm-sub text-muted">
                          {item.name ? <>Đơn từ {fmtVND(minOrder)}</> : null}
                          {item.per_user_limit ? (
                            <>{item.name ? " · " : ""}Tối đa {item.per_user_limit} lần/khách</>
                          ) : null}
                        </div>
                      </td>
                      <td className="text-center fw-semibold text-danger" style={{ fontSize: 15 }}>
                        {isPercent ? (
                          <>
                            <div>-{item.discount_value}%</div>
                            {Number(item.max_discount_amount) > 0 && (
                              <div className="text-muted small fw-normal">
                                Tối đa {fmtVND(item.max_discount_amount)}
                              </div>
                            )}
                          </>
                        ) : isFreeShip ? (
                          <>
                            <div className="text-success">Freeship</div>
                            <div className="text-muted small fw-normal">
                              Tối đa {fmtVND(item.discount_value)}
                            </div>
                          </>
                        ) : (
                          <div>-{fmtVND(item.discount_value)}</div>
                        )}
                      </td>
                      <td className="text-center">
                        <span className="fw-semibold">
                          {usedQty} / {totalQty}
                        </span>
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
                          <button
                            type="button"
                            className="adm-action-btn"
                            title="Chỉnh sửa"
                            aria-label={`Sửa ${item.code}`}
                            onClick={() => handleOpenEdit(item)}
                          >
                            <i className="bi bi-pencil-square" />
                          </button>
                          <button
                            type="button"
                            className={`adm-action-btn ${item.status === "locked" ? "unlock" : "lock"}`}
                            title={item.status === "locked" ? "Mở khóa mã" : "Khóa mã"}
                            onClick={() => handleToggleLock(item)}
                          >
                            <i
                              className={`bi ${
                                item.status === "locked" ? "bi-unlock" : "bi-lock"
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

      {/* ── MODAL ADD / EDIT ── */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-bottom px-4 pt-4 pb-3">
                <div>
                  <h5 className="modal-title fw-bold">
                    {editingItem ? "Chỉnh sửa mã giảm giá" : "Thêm mã giảm giá mới"}
                  </h5>
                  <div className="text-muted small">
                    Đồng bộ trực tiếp với hệ thống đơn hàng & áp dụng thanh toán
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                />
              </div>
              <form onSubmit={handleSaveModal}>
                <div className="modal-body px-4 py-3">
                  <div className="row g-3 mb-2">
                    <div className="col-12 col-md-5">
                      <label className="form-label fw-semibold">
                        Mã Voucher (Code) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control text-uppercase font-monospace fw-bold"
                        placeholder="VD: GIAM50K"
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            code: e.target.value.toUpperCase().replace(/\s+/g, ""),
                          })
                        }
                        required
                      />
                    </div>
                    <div className="col-12 col-md-7">
                      <label className="form-label fw-semibold">
                        Tên chương trình / Mô tả <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="VD: Giảm 50k cho đơn từ 200k"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-2">
                    <div className="col-12 col-md-4">
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
                        <option value="free_shipping">Ưu đãi phí vận chuyển</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold">
                        {formData.discount_type === "percentage"
                          ? "Mức giảm (%)"
                          : "Mức giảm (VNĐ)"}{" "}
                        <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        max={formData.discount_type === "percentage" ? "100" : undefined}
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
                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold">
                        Giảm tối đa (VNĐ)
                        {formData.discount_type !== "percentage" && (
                          <span className="text-muted fw-normal"> (Không áp dụng)</span>
                        )}
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        step="1000"
                        placeholder="0 = Không giới hạn"
                        disabled={formData.discount_type !== "percentage"}
                        value={formData.max_discount_amount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_discount_amount: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-2">
                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold">
                        Đơn tối thiểu (VNĐ) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        step="1000"
                        placeholder="VD: 200000"
                        value={formData.min_order_value}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            min_order_value: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold">
                        Tổng số lượng phát hành <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        value={formData.total_quantity}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            total_quantity: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold">
                        Giới hạn / khách hàng <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        value={formData.per_user_limit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            per_user_limit: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-2">
                    <div className="col-12 col-md-4">
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
                    <div className="col-12 col-md-4">
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
                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold">Trạng thái</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                      >
                        <option value="active">Đang kích hoạt</option>
                        <option value="upcoming">Sắp áp dụng</option>
                        <option value="locked">Tạm khóa</option>
                        <option value="expired">Đã hết hạn</option>
                        <option value="out_of_stock">Hết lượt dùng</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top px-4 py-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-4 fw-semibold"
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn-dark px-4 fw-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Đang lưu...
                      </>
                    ) : editingItem ? (
                      "Lưu thay đổi"
                    ) : (
                      "Tạo mã giảm giá"
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

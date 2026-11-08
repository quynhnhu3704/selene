// frontend/src/pages/Admin/Promotions/ProductPromotions.jsx
import { useState, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";
import AdminSelect from "../components/AdminSelect";
import Pagination from "../../../components/common/Pagination";
import EmptyState from "../../../components/common/EmptyState";
import {
  INITIAL_PRODUCT_PROMOTIONS,
  PRODUCT_PROMOTION_STATUSES,
  PRODUCT_SORT_OPTIONS,
  getProductPromotionStatus,
  fmtVND,
  formatDate,
} from "./mockData";

const ITEMS_PER_PAGE = 8;

export default function ProductPromotions() {
  const [promotions, setPromotions] = useState(() => {
    const saved = localStorage.getItem("selene_mock_product_promotions");
    return saved ? JSON.parse(saved) : INITIAL_PRODUCT_PROMOTIONS;
  });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    scope: "Toàn bộ sản phẩm",
    discount_type: "percent",
    discount_value: "",
    status: "active",
    start_date: "",
    end_date: "",
  });

  const composing = useRef(false);

  const saveToStorage = (updated) => {
    setPromotions(updated);
    try {
      localStorage.setItem(
        "selene_mock_product_promotions",
        JSON.stringify(updated),
      );
    } catch {
      /* ignore */
    }
  };

  // Filter & Sort
  const filteredPromotions = useMemo(() => {
    let result = [...promotions];

    if (q.trim()) {
      const keyword = q.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.code.toLowerCase().includes(keyword) ||
          item.name.toLowerCase().includes(keyword) ||
          item.scope.toLowerCase().includes(keyword),
      );
    }

    if (status) {
      result = result.filter((item) => item.status === status);
    }

    if (sort === "newest") {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === "oldest") {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sort === "discount_desc") {
      result.sort((a, b) => b.discount_value - a.discount_value);
    } else if (sort === "discount_asc") {
      result.sort((a, b) => a.discount_value - b.discount_value);
    } else if (sort === "az") {
      result.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }

    return result;
  }, [promotions, q, status, sort]);

  // Pagination calculation
  const totalItems = filteredPromotions.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const paginatedPromotions = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredPromotions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPromotions, page]);

  const handleReset = () => {
    setQ("");
    setStatus("");
    setSort("default");
    setPage(1);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      code: "",
      name: "",
      scope: "Toàn bộ sản phẩm",
      discount_type: "percent",
      discount_value: "",
      status: "active",
      start_date: "",
      end_date: "",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      scope: item.scope,
      discount_type: item.discount_type,
      discount_value: item.discount_value,
      status: item.status,
      start_date: item.start_date,
      end_date: item.end_date,
    });
    setShowModal(true);
  };

  const handleSaveModal = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning("Vui lòng nhập tên chương trình khuyến mãi!");
      return;
    }
    if (!formData.discount_value || Number(formData.discount_value) <= 0) {
      toast.warning("Mức giảm phải lớn hơn 0!");
      return;
    }

    if (editingItem) {
      const updated = promotions.map((item) =>
        item.id === editingItem.id
          ? { ...item, ...formData, discount_value: Number(formData.discount_value) }
          : item,
      );
      saveToStorage(updated);
      toast.success("Cập nhật khuyến mãi thành công!");
    } else {
      const newItem = {
        id: `KM${Date.now().toString().slice(-4)}`,
        ...formData,
        discount_value: Number(formData.discount_value),
        created_at: new Date().toISOString().slice(0, 10),
      };
      saveToStorage([newItem, ...promotions]);
      toast.success("Thêm khuyến mãi mới thành công!");
    }

    setShowModal(false);
  };

  const handleToggleLock = (item) => {
    const isPaused = item.status === "paused";
    const nextStatus = isPaused ? "active" : "paused";
    const updated = promotions.map((p) =>
      p.id === item.id ? { ...p, status: nextStatus } : p,
    );
    saveToStorage(updated);
    toast.info(
      nextStatus === "paused"
        ? `Đã khóa khuyến mãi "${item.name}"`
        : `Đã mở khóa khuyến mãi "${item.name}"`,
    );
  };

  return (
    <>
      <Helmet>
        <title>Khuyến mãi sản phẩm | Selene</title>
      </Helmet>

      {/* ── PAGE HEADER (Matches Orders Layout) ── */}
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
          aria-label="Lọc trạng thái khuyến mãi"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {PRODUCT_PROMOTION_STATUSES.map((item) => (
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
            setPage(1);
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

      {/* ── TABLE (Identical to Orders table in Image 3) ── */}
      <div className="adm-table-wrap table-responsive overflow-x-auto">
        <table className="table adm-table mb-0" style={{ minWidth: 1000 }}>
          <thead>
            <tr>
              <th className="text-center" style={{ width: "5%" }}>#</th>
              <th style={{ width: "22%" }}>Khuyến mãi</th>
              <th style={{ width: "22%" }}>Áp dụng</th>
              <th className="text-end" style={{ width: "14%" }}>Mức giảm</th>
              <th className="text-center" style={{ width: "17%" }}>Trạng thái</th>
              <th className="text-center" style={{ width: "14%" }}>Thời gian áp dụng</th>
              <th className="text-center" style={{ width: "6%" }}></th>
            </tr>
          </thead>
          <tbody>
            {!paginatedPromotions.length ? (
              <tr>
                <td colSpan={7} className="page-empty py-5">
                  <EmptyState text="Không có chương trình khuyến mãi nào để hiển thị" />
                </td>
              </tr>
            ) : (
              paginatedPromotions.map((item, index) => {
                const state = getProductPromotionStatus(item.status);
                const stt = (page - 1) * ITEMS_PER_PAGE + index + 1;
                return (
                  <tr key={item.id}>
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
                        {item.code}
                      </div>
                      <div className="adm-sub text-muted">{item.name}</div>
                    </td>
                    <td>
                      <div className="adm-name">{item.scope}</div>
                      <div className="adm-sub text-muted">
                        Tạo ngày: {formatDate(item.created_at)}
                      </div>
                    </td>
                    <td className="text-end fw-semibold text-danger" style={{ fontSize: 15 }}>
                      {item.discount_type === "percent"
                        ? `-${item.discount_value}%`
                        : `-${fmtVND(item.discount_value)}`}
                    </td>
                    <td className="text-center">
                      <span
                        className={`adm-status rounded-pill text-${state.color} bg-${state.color}-subtle`}
                        style={{ width: "8.5rem", display: "inline-block" }}
                      >
                        {state.label}
                      </span>
                    </td>
                    <td className="text-center text-nowrap" style={{ fontSize: 13.5 }}>
                      <div>{formatDate(item.start_date)}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        đến {formatDate(item.end_date)}
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="d-flex gap-1 justify-content-center">
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
                          className={`adm-action-btn ${item.status === "paused" ? "unlock" : "lock"}`}
                          title={item.status === "paused" ? "Mở khóa khuyến mãi" : "Khóa khuyến mãi"}
                          onClick={() => handleToggleLock(item)}
                        >
                          <i
                            className={`bi ${
                              item.status === "paused"
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

      {/* ── PAGINATION ── */}
      {totalItems > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          displayedCount={paginatedPromotions.length}
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
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Mã khuyến mãi</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Tên chương trình khuyến mãi
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: Ưu đãi Mùa Hè Rực Rỡ"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Phạm vi áp dụng</label>
                    <select
                      className="form-select"
                      value={formData.scope}
                      onChange={(e) =>
                        setFormData({ ...formData, scope: e.target.value })
                      }
                    >
                      <option value="Toàn bộ sản phẩm">Toàn bộ sản phẩm</option>
                      <option value="Danh mục Áo nam">Danh mục Áo nam</option>
                      <option value="Danh mục Quần Jean">Danh mục Quần Jean</option>
                      <option value="Áo khoác & Hoodie">Áo khoác & Hoodie</option>
                      <option value="Áo thun phong cách">Áo thun phong cách</option>
                      <option value="Tất cả phụ kiện">Tất cả phụ kiện</option>
                      <option value="Sản phẩm chọn lọc (12 SP)">Sản phẩm chọn lọc (12 SP)</option>
                    </select>
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
                        <option value="percent">Phần trăm (%)</option>
                        <option value="fixed">Số tiền trực tiếp (VNĐ)</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold">Mức giảm</label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
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
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold">Ngày bắt đầu</label>
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
                      <label className="form-label fw-semibold">Ngày kết thúc</label>
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
                      {PRODUCT_PROMOTION_STATUSES.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-4 fw-semibold"
                    onClick={() => setShowModal(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn-dark px-4 fw-semibold"
                  >
                    {editingItem ? "Lưu thay đổi" : "Tạo khuyến mãi"}
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


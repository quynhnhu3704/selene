// frontend/src/pages/Admin/Promotions/components/VoucherPage.jsx
import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";
import Loading from "../../../../components/common/Loading";
import {
  getAdminVoucherById,
  createAdminVoucher,
  updateAdminVoucher,
} from "../../../../services/voucher.service";
import {
  INITIAL_ORDER_DISCOUNTS,
  ORDER_DISCOUNT_STATUSES,
  fmtVND,
  formatDate,
} from "../mockData";

const formatDateForInput = (dateVal) => {
  if (!dateVal) return "";
  if (typeof dateVal === "string" && dateVal.includes("T")) {
    return dateVal.split("T")[0];
  }
  if (typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    return dateVal;
  }
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Format raw number/string to Vietnamese currency string with dots (e.g. 50000 -> "50.000")
const formatNumberVND = (val) => {
  if (val === null || val === undefined || val === "") return "";
  const num = Number(String(val).replace(/\D/g, ""));
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("vi-VN");
};

export default function VoucherPage({ create = false }) {
  const { voucherId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const base = "/admin/khuyen-mai/ma-giam-gia";
  const requestedReturn = params.get("returnUrl");
  const back =
    requestedReturn === base || requestedReturn?.startsWith(base + "?")
      ? requestedReturn
      : base;

  const title = create ? "Thêm mã giảm giá mới" : "Chỉnh sửa mã giảm giá";

  const [form, setForm] = useState({
    code: create ? `GIAM${Math.floor(20 + Math.random() * 80)}K` : "",
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

  const [loading, setLoading] = useState(!create);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actualVoucherId, setActualVoucherId] = useState(voucherId);

  // Load voucher details when editing
  useEffect(() => {
    if (create) return;
    let isCurrentRequest = true;

    const loadVoucher = async () => {
      setLoading(true);
      setError("");

      let voucherData = null;

      // 1. Try fetching from backend API
      try {
        const res = await getAdminVoucherById(voucherId);
        if (res?.data) {
          voucherData = res.data;
        }
      } catch (apiErr) {
        console.warn("Không thể tải voucher từ API, thử tìm từ bộ nhớ cục bộ:", apiErr.message);
      }

      // 2. If not found from API, fallback to localStorage or INITIAL_ORDER_DISCOUNTS
      if (!voucherData) {
        try {
          const saved = localStorage.getItem("selene_mock_order_discounts");
          const list = saved ? JSON.parse(saved) : INITIAL_ORDER_DISCOUNTS;
          const found = list.find(
            (item) =>
              (item.voucher_id && String(item.voucher_id) === String(voucherId)) ||
              (item.id && String(item.id) === String(voucherId)) ||
              (item.code && String(item.code).toLowerCase() === String(voucherId).toLowerCase()),
          );
          if (found) {
            voucherData = found;
          }
        } catch {
          /* ignore */
        }
      }

      if (!isCurrentRequest) return;

      if (voucherData) {
        const realId = voucherData.voucher_id || voucherData.id || voucherId;
        setActualVoucherId(realId);
        setForm({
          code: voucherData.code || "",
          name: voucherData.name || "",
          discount_type:
            voucherData.discount_type === "percent"
              ? "percentage"
              : voucherData.discount_type === "fixed"
                ? "fixed_amount"
                : voucherData.discount_type || "percentage",
          discount_value: voucherData.discount_value ?? 0,
          min_order_value: voucherData.min_order_value ?? voucherData.min_order ?? 0,
          max_discount_amount: voucherData.max_discount_amount ?? 0,
          total_quantity: voucherData.total_quantity ?? voucherData.max_usage ?? 100,
          per_user_limit: voucherData.per_user_limit ?? 1,
          status:
            voucherData.status === "locked"
              ? "inactive"
              : voucherData.status === "depleted"
                ? "out_of_stock"
                : voucherData.status || "active",
          start_date: formatDateForInput(voucherData.start_date),
          end_date: formatDateForInput(voucherData.end_date),
        });
      } else {
        setError("Không tìm thấy thông tin mã giảm giá này hoặc mã đã bị xóa.");
      }

      setLoading(false);
    };

    loadVoucher();

    return () => {
      isCurrentRequest = false;
    };
  }, [create, voucherId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCurrencyChange = (field, text) => {
    const clean = text.replace(/\D/g, "");
    handleChange(field, clean === "" ? "" : Number(clean));
  };

  const handleGenerateCode = () => {
    const randomNum = Math.floor(20 + Math.random() * 80);
    handleChange("code", `GIAM${randomNum}K`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!form.code.trim()) {
      toast.warning("Vui lòng nhập mã voucher!");
      return;
    }
    if (!form.name.trim()) {
      toast.warning("Vui lòng nhập tên chương trình giảm giá!");
      return;
    }
    if (Number(form.discount_value) <= 0) {
      toast.warning("Mức giảm phải lớn hơn 0!");
      return;
    }
    if (form.discount_type === "percentage" && Number(form.discount_value) > 100) {
      toast.warning("Mức giảm phần trăm không được vượt quá 100%!");
      return;
    }
    if (!form.start_date || !form.end_date) {
      toast.warning("Vui lòng chọn thời gian bắt đầu và kết thúc!");
      return;
    }
    if (new Date(form.start_date) > new Date(form.end_date)) {
      toast.warning("Ngày bắt đầu không được lớn hơn ngày kết thúc!");
      return;
    }

    const payload = {
      code: form.code.toUpperCase().replace(/\s+/g, ""),
      name: form.name.trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_value: Number(form.min_order_value || 0),
      max_discount_amount:
        form.discount_type === "percentage"
          ? Number(form.max_discount_amount || 0)
          : 0,
      total_quantity: Number(form.total_quantity || 1),
      per_user_limit: Number(form.per_user_limit || 1),
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(`${form.end_date}T23:59:59Z`).toISOString(),
      status: form.status,
    };

    try {
      setSaving(true);

      if (create) {
        let createdVoucher = null;
        try {
          const res = await createAdminVoucher({
            ...payload,
            used_quantity: 0,
          });
          createdVoucher = res?.data;
        } catch (apiErr) {
          console.warn("API create voucher failed, saving locally:", apiErr.message);
        }

        // Cập nhật bộ nhớ cục bộ
        const saved = localStorage.getItem("selene_mock_order_discounts");
        const list = saved ? JSON.parse(saved) : INITIAL_ORDER_DISCOUNTS;
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

        try {
          localStorage.setItem(
            "selene_mock_order_discounts",
            JSON.stringify([newItem, ...list]),
          );
        } catch {
          /* ignore */
        }

        toast.success("Thêm mã giảm giá mới thành công!");
        navigate(back);
      } else {
        const idToUpdate = actualVoucherId || voucherId;
        let res = null;
        try {
          // Gửi PUT request tới API: http://localhost:8000/api/orders/manage/vouchers/update/:voucherId
          res = await updateAdminVoucher(idToUpdate, payload);
        } catch (apiErr) {
          const errMsg = apiErr.response?.data?.message || apiErr.message;
          // Nếu có lỗi từ server trả về (400, 401, 403, 409...), hiển thị thông báo lỗi
          if (apiErr.response && apiErr.response.status !== 404) {
            throw new Error(errMsg);
          }
          console.warn("API update voucher failed or 404, fallback to local storage:", errMsg);
        }

        // Cập nhật bộ nhớ cục bộ
        const saved = localStorage.getItem("selene_mock_order_discounts");
        const list = saved ? JSON.parse(saved) : INITIAL_ORDER_DISCOUNTS;
        const updated = list.map((item) =>
          (item.voucher_id && String(item.voucher_id) === String(idToUpdate)) ||
          (item.id && String(item.id) === String(idToUpdate)) ||
          (item.code && String(item.code).toLowerCase() === String(idToUpdate).toLowerCase())
            ? {
                ...item,
                ...payload,
                ...(res?.data || {}),
                min_order: payload.min_order_value,
                max_usage: payload.total_quantity,
              }
            : item,
        );

        try {
          localStorage.setItem(
            "selene_mock_order_discounts",
            JSON.stringify(updated),
          );
        } catch {
          /* ignore */
        }

        toast.success(res?.message || "Cập nhật mã giảm giá thành công!");
        navigate(back);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Đã xảy ra lỗi khi lưu mã giảm giá!");
    } finally {
      setSaving(false);
    }
  };

  // Preview badge calculation
  const previewBadge = useMemo(() => {
    if (form.discount_type === "percentage") {
      return `Giảm ${form.discount_value}%`;
    }
    if (form.discount_type === "free_shipping") {
      return "Miễn phí vận chuyển";
    }
    return `Giảm ${fmtVND(form.discount_value)}`;
  }, [form.discount_type, form.discount_value]);

  return (
    <>
      <Helmet>
        <title>{title} | Selene</title>
      </Helmet>

      <style>{`
        .vp-label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 5px;
          white-space: nowrap;
          display: block;
        }
        .vp-input {
          font-size: 13.5px;
          height: 38px;
        }
        .vp-card-title {
          font-size: 14px;
          font-weight: 700;
          color: #1f2937;
        }
      `}</style>

      {/* ── PAGE HEADER (ĐÃ XÓA TIÊU ĐỀ PHỤ) ── */}
      <div className="adm-page-head">
        <div className="adm-page-title">{title}</div>
        <div className="d-flex gap-2">
          <Link to={back} className="form-btn btn btn-outline-dark fw-semibold px-3">
            <i className="bi bi-arrow-left me-1" /> Quay lại
          </Link>
          <button
            type="button"
            className="form-btn btn btn-dark fw-semibold px-4"
            onClick={handleSubmit}
            disabled={saving || loading}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Đang lưu...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg me-1" />
                {create ? "Tạo mã giảm giá" : "Lưu thay đổi"}
              </>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div
          className="d-flex align-items-center justify-content-center"
          style={{ minHeight: "50vh" }}
        >
          <Loading text="Đang tải thông tin mã giảm giá..." />
        </div>
      ) : error ? (
        <div className="bg-white rounded-3 p-4 border text-center py-5">
          <div className="text-danger fs-1 mb-2">
            <i className="bi bi-exclamation-circle" />
          </div>
          <div className="fw-semibold text-danger fs-5 mb-3">{error}</div>
          <Link to={back} className="form-btn btn btn-dark px-4 fw-semibold">
            <i className="bi bi-arrow-left me-2" /> Quay lại danh sách
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="row g-4 align-items-start">
            {/* ══════ CỘT TRÁI: FORM THÔNG TIN (CHỮ NHỎ GỌN, KHÔNG XUỐNG HÀNG) ══════ */}
            <div className="col-12 col-xl-8">
              {/* KHỐI 1: THÔNG TIN CƠ BẢN */}
              <div className="bg-white rounded-3 p-4 border mb-4 shadow-sm">
                <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                  <i className="bi bi-ticket-perforated-fill text-danger fs-5" />
                  <span className="vp-card-title">Thông tin cơ bản</span>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="vp-label">
                      Mã Voucher (Code) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control vp-input text-uppercase font-monospace fw-bold"
                        placeholder="VD: GIAM50K"
                        value={form.code}
                        onChange={(e) =>
                          handleChange("code", e.target.value.toUpperCase().replace(/\s+/g, ""))
                        }
                        required
                        disabled={saving}
                        style={{ letterSpacing: "1px" }}
                      />
                      {create && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm px-3"
                          onClick={handleGenerateCode}
                          title="Tạo mã ngẫu nhiên"
                        >
                          <i className="bi bi-shuffle me-1" /> Tự động
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="vp-label">
                      Trạng thái hoạt động
                    </label>
                    <select
                      className="form-select vp-input"
                      value={form.status}
                      onChange={(e) => handleChange("status", e.target.value)}
                      disabled={saving}
                    >
                      <option value="active">Đang hoạt động</option>
                      <option value="inactive">Dừng hoạt động</option>
                      <option value="out_of_stock">Đã sử dụng hết suất</option>
                      <option value="expired">Đã hết thời gian</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="vp-label">
                      Tên mã giảm giá <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control vp-input"
                      placeholder="VD: Giảm 50.000đ cho đơn hàng từ 200.000đ"
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              {/* KHỐI 2: CHIẾT KHẤU & ĐIỀU KIỆN */}
              <div className="bg-white rounded-3 p-4 border mb-4 shadow-sm">
                <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                  <i className="bi bi-cash-coin text-warning fs-5" />
                  <span className="vp-card-title">
                    Mức giảm & Điều kiện áp dụng
                  </span>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <label className="vp-label">Loại giảm giá</label>
                    <select
                      className="form-select vp-input"
                      value={form.discount_type}
                      onChange={(e) => handleChange("discount_type", e.target.value)}
                      disabled={saving}
                    >
                      <option value="percentage">Phần trăm (%)</option>
                      <option value="fixed_amount">Số tiền cố định (VNĐ)</option>
                      <option value="free_shipping">Ưu đãi vận chuyển</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="vp-label">
                      {form.discount_type === "percentage"
                        ? "Mức giảm (%)"
                        : "Mức giảm (VNĐ)"}{" "}
                      <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      {form.discount_type === "percentage" ? (
                        <input
                          type="number"
                          className="form-control vp-input"
                          min="1"
                          max="100"
                          value={form.discount_value}
                          onChange={(e) => handleChange("discount_value", e.target.value)}
                          required
                          disabled={saving}
                        />
                      ) : (
                        <input
                          type="text"
                          className="form-control vp-input"
                          value={form.discount_value === "" ? "" : formatNumberVND(form.discount_value)}
                          onChange={(e) => handleCurrencyChange("discount_value", e.target.value)}
                          required
                          disabled={saving}
                        />
                      )}
                      <span className="input-group-text bg-light text-muted" style={{ fontSize: 13 }}>
                        {form.discount_type === "percentage" ? "%" : "đ"}
                      </span>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="vp-label">
                      Giảm tối đa (VNĐ)
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control vp-input"
                        placeholder={form.discount_type === "percentage" ? "0 = Không giới hạn" : "Không áp dụng"}
                        disabled={form.discount_type !== "percentage" || saving}
                        value={
                          form.discount_type !== "percentage"
                            ? "Không áp dụng"
                            : form.max_discount_amount === ""
                              ? ""
                              : formatNumberVND(form.max_discount_amount)
                        }
                        onChange={(e) => handleCurrencyChange("max_discount_amount", e.target.value)}
                      />
                      <span className="input-group-text bg-light text-muted" style={{ fontSize: 13 }}>
                        đ
                      </span>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="vp-label">
                      Đơn hàng tối thiểu (VNĐ) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control vp-input"
                        placeholder="VD: 200.000"
                        value={form.min_order_value === "" ? "" : formatNumberVND(form.min_order_value)}
                        onChange={(e) => handleCurrencyChange("min_order_value", e.target.value)}
                        required
                        disabled={saving}
                      />
                      <span className="input-group-text bg-light text-muted" style={{ fontSize: 13 }}>
                        đ
                      </span>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="vp-label">
                      Số tiền giảm dự kiến
                    </label>
                    <div className="form-control vp-input bg-light text-muted d-flex align-items-center">
                      {form.discount_type === "percentage" ? (
                        <span>
                          Giảm <strong>{form.discount_value}%</strong>
                          {Number(form.max_discount_amount) > 0 && (
                            <> (tối đa <strong>{fmtVND(form.max_discount_amount)}</strong>)</>
                          )}
                        </span>
                      ) : (
                        <span>
                          Giảm trực tiếp <strong>{fmtVND(form.discount_value)}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* KHỐI 3: THỜI GIAN & LƯỢT DÙNG */}
              <div className="bg-white rounded-3 p-4 border mb-4 shadow-sm">
                <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                  <i className="bi bi-calendar-event text-primary fs-5" />
                  <span className="vp-card-title">
                    Thời gian hiệu lực & Lượt phát hành
                  </span>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="vp-label">
                      Ngày bắt đầu <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control vp-input"
                      value={form.start_date}
                      onChange={(e) => handleChange("start_date", e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="vp-label">
                      Ngày kết thúc <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control vp-input"
                      value={form.end_date}
                      onChange={(e) => handleChange("end_date", e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="vp-label">
                      Tổng số lượng phát hành <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control vp-input"
                      min="1"
                      placeholder="VD: 100"
                      value={form.total_quantity}
                      onChange={(e) => handleChange("total_quantity", e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="vp-label">
                      Giới hạn / Mỗi khách hàng <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control vp-input"
                      min="1"
                      placeholder="VD: 1"
                      value={form.per_user_limit}
                      onChange={(e) => handleChange("per_user_limit", e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* ══════ CỘT PHẢI: XEM TRƯỚC VOUCHER (ĐÃ XÓA PHẦN XÁC NHẬN THÔNG TIN) ══════ */}
            <div className="col-12 col-xl-4" style={{ position: "sticky", top: "20px" }}>
              {/* PREVIEW CARD */}
              <div className="bg-white rounded-3 p-4 border shadow-sm">
                <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-eye text-info fs-5" />
                    <span className="vp-card-title">Xem trước voucher</span>
                  </div>
                  <span className="badge bg-secondary-subtle text-secondary small">
                    Hiển thị khách
                  </span>
                </div>

                {/* VOUCHER CARD SIMULATION */}
                <div
                  className="rounded-3 p-3 position-relative overflow-hidden"
                  style={{
                    backgroundColor: "#fffdf9",
                    border: "1.5px dashed #e2a03f",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div className="fw-bold text-dark text-truncate" title={form.name}>
                        {form.name || "Tên mã giảm giá..."}
                      </div>
                      <div
                        className="fw-bold my-1"
                        style={{ color: "#c2410c", fontSize: 16 }}
                      >
                        {previewBadge}
                      </div>
                    </div>
                    <i className="bi bi-ticket-perforated fs-2 text-warning opacity-75 flex-shrink-0" />
                  </div>

                  <div className="small text-muted mt-2" style={{ fontSize: 12.5 }}>
                    <div>
                      Đơn tối thiểu {fmtVND(form.min_order_value)}
                      {form.discount_type === "percentage" &&
                        Number(form.max_discount_amount) > 0 && (
                          <> · Tối đa {fmtVND(form.max_discount_amount)}</>
                        )}
                    </div>
                    <div className="mt-1">
                      HSD: {formatDate(form.start_date)} - {formatDate(form.end_date)}
                    </div>
                    {form.per_user_limit > 0 && (
                      <div className="text-secondary mt-1">
                        Tối đa {form.per_user_limit} lượt/khách hàng
                      </div>
                    )}
                  </div>

                  <div className="d-flex justify-content-between align-items-center gap-2 mt-3 pt-2 border-top">
                    <span
                      className="fw-bold font-monospace text-uppercase px-2 py-1 bg-white border rounded text-dark"
                      style={{ fontSize: 13, letterSpacing: "1px" }}
                    >
                      {form.code || "VOUCHERCODE"}
                    </span>
                    <span
                      className={`badge rounded-pill text-${
                        ORDER_DISCOUNT_STATUSES.find((s) => s.key === form.status)?.color ||
                        "secondary"
                      } bg-${
                        ORDER_DISCOUNT_STATUSES.find((s) => s.key === form.status)?.color ||
                        "secondary"
                      }-subtle px-2 py-1`}
                    >
                      {ORDER_DISCOUNT_STATUSES.find((s) => s.key === form.status)?.label ||
                        form.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </>
  );
}

import AdminSelect from "../../components/AdminSelect";
import { DateInput } from "../../../../components/common/DatePicker";
import AdminSaveButton from "../../components/AdminSaveButton";
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

// Format number compactly for condition sentences (e.g. 700000 -> "700k", 150000 -> "150k")
const formatK = (val) => {
  if (!val || Number(val) === 0) return "0đ";
  const num = Number(val);
  if (num >= 1000 && num % 1000 === 0) {
    return `${(num / 1000).toLocaleString("vi-VN")}k`;
  }
  return fmtVND(num);
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
    code: "",
    name: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    min_order_value: "",
    max_discount_amount: "",
    total_quantity: "",
    per_user_limit: "",
    status: "active",
    start_date: "",
    end_date: "",
  });

  const [isCustomDesc, setIsCustomDesc] = useState(false);
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
        console.warn("Không thể tải voucher từ API:", apiErr.message);
      }

      if (!isCurrentRequest) return;

      if (voucherData) {
        const realId = voucherData.voucher_id || voucherData.id || voucherId;
        setActualVoucherId(realId);
        setForm({
          code: voucherData.code || "",
          name: voucherData.name || "",
          description: voucherData.description || "",
          discount_type:
            voucherData.discount_type === "percent"
              ? "percentage"
              : voucherData.discount_type === "fixed"
                ? "fixed_amount"
                : voucherData.discount_type || "percentage",
          discount_value: voucherData.discount_value ?? "",
          min_order_value: voucherData.min_order_value ?? voucherData.min_order ?? 0,
          max_discount_amount: voucherData.max_discount_amount ?? 0,
          total_quantity: voucherData.total_quantity ?? voucherData.max_usage ?? 0,
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
        if (voucherData.description) {
          setIsCustomDesc(true);
        }
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
    if (form.discount_value === "" || Number(form.discount_value) <= 0) {
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
    if (form.total_quantity === "" || Number(form.total_quantity) <= 0) {
      toast.warning("Vui lòng nhập tổng số lượng phát hành hợp lệ!");
      return;
    }
    if (form.per_user_limit === "" || Number(form.per_user_limit) <= 0) {
      toast.warning("Vui lòng nhập giới hạn lượt dùng cho mỗi khách hàng!");
      return;
    }

    const payload = {
      code: form.code.toUpperCase().replace(/\s+/g, ""),
      name: form.name.trim(),
      description: (form.description?.trim() || conditionDescription || "").trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_value: Number(form.min_order_value || 0),
      max_discount_amount:
        form.discount_type === "percentage"
          ? Number(form.max_discount_amount || 0)
          : 0,
      total_quantity: Number(form.total_quantity || 1),
      per_user_limit: Number(form.per_user_limit || 1),
      start_date: new Date(`${form.start_date}T00:00:00Z`).toISOString(),
      end_date: new Date(`${form.end_date}T23:59:59Z`).toISOString(),
      status: form.status,
    };

    try {
      setSaving(true);

      const res = create
        ? await createAdminVoucher(payload)
        : await updateAdminVoucher(actualVoucherId || voucherId, payload);
      toast.success(res?.message || "Lưu mã giảm giá thành công!");
      navigate(back);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Đã xảy ra lỗi khi lưu mã giảm giá!");
    } finally {
      setSaving(false);
    }
  };

  // Preview badge calculation
  const previewBadge = useMemo(() => {
    if (form.discount_type === "percentage") {
      return form.discount_value !== "" ? `Giảm ${form.discount_value}%` : "Chưa có mức giảm";
    }
    if (form.discount_type === "free_shipping") {
      return "Miễn phí vận chuyển";
    }
    return form.discount_value !== "" ? `Giảm ${fmtVND(form.discount_value)}` : "Chưa có mức giảm";
  }, [form.discount_type, form.discount_value]);

  // Auto-generate condition description sentence
  const conditionDescription = useMemo(() => {
    const { discount_type, discount_value, max_discount_amount, min_order_value } = form;

    const hasDiscount = discount_value !== "" && Number(discount_value) > 0;
    const hasMinOrder = min_order_value !== "" && Number(min_order_value) > 0;
    const hasMaxDiscount =
      discount_type === "percentage" &&
      max_discount_amount !== "" &&
      Number(max_discount_amount) > 0;

    if (!hasDiscount && !hasMinOrder && discount_type !== "free_shipping") {
      return "";
    }

    let text = "";
    if (discount_type === "percentage") {
      if (hasDiscount) {
        text = `Giảm ${discount_value}%`;
        if (hasMaxDiscount) {
          text += ` tối đa ${formatK(max_discount_amount)}`;
        }
      }
    } else if (discount_type === "free_shipping") {
      text = "Miễn phí vận chuyển";
      if (hasDiscount) {
        text += ` tối đa ${formatK(discount_value)}`;
      }
    } else {
      // fixed_amount
      if (hasDiscount) {
        text = `Giảm ${fmtVND(discount_value)}`;
      }
    }

    if (hasMinOrder) {
      if (text) {
        text += ` cho đơn từ ${formatK(min_order_value)}`;
      } else {
        text = `Áp dụng cho đơn từ ${formatK(min_order_value)}`;
      }
    }

    return text;
  }, [
    form.discount_type,
    form.discount_value,
    form.max_discount_amount,
    form.min_order_value,
  ]);

  // Tự động gán mô tả điều kiện vào form.description nếu người dùng chưa tự chỉnh sửa
  useEffect(() => {
    if (!isCustomDesc) {
      setForm((prev) => ({ ...prev, description: conditionDescription }));
    }
  }, [conditionDescription, isCustomDesc]);

  return (
    <>
      <Helmet>
        <title>{title} | Selene</title>
      </Helmet>


      {/* ── PAGE HEADER (ĐÃ XÓA TIÊU ĐỀ PHỤ) ── */}
      <div className="adm-form-head adm-page-head">
        <div className="adm-page-title">{title}</div>
        <div className="d-flex gap-2">
          <Link to={back} className="form-btn btn btn-outline-dark fw-semibold px-3">
            <i className="bi bi-arrow-left me-1" /> Quay lại
          </Link>
          <AdminSaveButton onClick={handleSubmit} disabled={loading} saving={saving}>
            {create ? "Thêm mã giảm giá" : "Lưu thay đổi"}
          </AdminSaveButton>
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
              <div className="edit-section">
                <div className="edit-section-title">
                  <i className="bi bi-ticket-perforated-fill" />
                  <span>Thông tin cơ bản</span>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Mã Voucher <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control text-uppercase"
                      placeholder="VD: GIAM50K"
                      value={form.code}
                      onChange={(e) =>
                        handleChange("code", e.target.value.toUpperCase().replace(/\s+/g, ""))
                      }
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Trạng thái hoạt động
                    </label>
                    <AdminSelect
                      aria-label="Trạng thái hoạt động"
                      value={form.status}
                      onChange={(e) => handleChange("status", e.target.value)}
                      disabled={saving}
                    >
                      <option value="active">Đang hoạt động</option>
                      <option value="inactive">Dừng hoạt động</option>
                      <option value="out_of_stock">Đã sử dụng hết suất</option>
                      <option value="expired">Đã hết thời gian</option>
                    </AdminSelect>
                  </div>

                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <label className="form-label mb-0">
                        Tên mã giảm giá <span className="text-danger">*</span>
                      </label>
                      {conditionDescription && form.name !== conditionDescription && (
                        <button
                          type="button"
                          className="form-link-sm border-0 bg-transparent p-0"
                          onClick={() => handleChange("name", conditionDescription)}
                          title="Điền tự động từ mô tả điều kiện"
                        >
                          <i className="bi bi-magic me-1" /> Dùng mô tả điều kiện làm tên
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      className="form-control mt-1"
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
              <div className="edit-section">
                <div className="edit-section-title">
                  <i className="bi bi-cash-coin" />
                  <span>
                    Mức giảm & Điều kiện áp dụng
                  </span>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <label className="form-label">Loại giảm giá</label>
                    <AdminSelect
                      aria-label="Loại giảm giá"
                      value={form.discount_type}
                      onChange={(e) => handleChange("discount_type", e.target.value)}
                      disabled={saving}
                    >
                      <option value="percentage">Phần trăm (%)</option>
                      <option value="fixed_amount">Số tiền cố định (VNĐ)</option>
                      <option value="free_shipping">Ưu đãi vận chuyển</option>
                    </AdminSelect>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      {form.discount_type === "percentage"
                        ? "Mức giảm (%)"
                        : "Mức giảm (VNĐ)"}{" "}
                      <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      {form.discount_type === "percentage" ? (
                        <input
                          type="number"
                          className="form-control"
                          min="1"
                          max="100"
                          placeholder="VD: 20"
                          value={form.discount_value}
                          onChange={(e) => handleChange("discount_value", e.target.value)}
                          required
                          disabled={saving}
                        />
                      ) : (
                        <input
                          type="text"
                          className="form-control"
                          placeholder="VD: 50.000"
                          value={form.discount_value === "" ? "" : formatNumberVND(form.discount_value)}
                          onChange={(e) => handleCurrencyChange("discount_value", e.target.value)}
                          required
                          disabled={saving}
                        />
                      )}
                      <span className="input-group-text text-muted">
                        {form.discount_type === "percentage" ? "%" : "đ"}
                      </span>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      Giảm tối đa (VNĐ)
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={form.discount_type === "percentage" ? "VD: 200.000" : "Không áp dụng"}
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
                      <span className="input-group-text text-muted">
                        đ
                      </span>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Đơn hàng tối thiểu (VNĐ) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="VD: 200.000"
                        value={form.min_order_value === "" ? "" : formatNumberVND(form.min_order_value)}
                        onChange={(e) => handleCurrencyChange("min_order_value", e.target.value)}
                        required
                        disabled={saving}
                      />
                      <span className="input-group-text text-muted">
                        đ
                      </span>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label mb-0">
                        Mô tả điều kiện
                      </label>
                      {isCustomDesc && conditionDescription && (
                        <button
                          type="button"
                          className="form-link-sm border-0 bg-transparent p-0"
                          onClick={() => {
                            setIsCustomDesc(false);
                            handleChange("description", conditionDescription);
                          }}
                          title="Đặt lại theo câu điều kiện tự động tạo"
                        >
                          <i className="bi bi-arrow-counterclockwise me-1" /> Tự động
                        </button>
                      )}
                    </div>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={conditionDescription || "VD: Giảm 20% tối đa 150k cho đơn từ 700k"}
                        value={form.description}
                        onChange={(e) => {
                          setIsCustomDesc(true);
                          handleChange("description", e.target.value);
                        }}
                        disabled={saving}
                      />
                      {(form.description || conditionDescription) && (
                        <button
                          type="button"
                          className="btn btn-outline-dark px-3"
                          onClick={() => {
                            navigator.clipboard.writeText(form.description || conditionDescription);
                            toast.info("Đã sao chép mô tả điều kiện!");
                          }}
                          title="Sao chép mô tả điều kiện"
                        >
                          <i className="bi bi-clipboard" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* KHỐI 3: THỜI GIAN & LƯỢT DÙNG */}
              <div className="edit-section">
                <div className="edit-section-title">
                  <i className="bi bi-calendar-event" />
                  <span>
                    Thời gian hiệu lực & Lượt phát hành
                  </span>
                </div>

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Ngày bắt đầu <span className="text-danger">*</span>
                    </label>
                    <DateInput
                      className="form-control"
                      value={form.start_date}
                      onChange={(e) => handleChange("start_date", e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Ngày kết thúc <span className="text-danger">*</span>
                    </label>
                    <DateInput
                      className="form-control"
                      value={form.end_date}
                      onChange={(e) => handleChange("end_date", e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Tổng số lượng phát hành <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      placeholder="VD: 100"
                      value={form.total_quantity}
                      onChange={(e) => handleChange("total_quantity", e.target.value)}
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Giới hạn / Mỗi khách hàng <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
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
            <div className="col-12 col-xl-4 adm-preview-column">
              {/* PREVIEW CARD */}
              <div className="edit-section">
                <div className="edit-section-title justify-content-between flex-wrap">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-eye" />
                    <span>Xem trước voucher</span>
                  </div>
                  <span className="badge bg-secondary-subtle text-secondary small">
                    Hiển thị khách
                  </span>
                </div>

                {/* VOUCHER CARD SIMULATION */}
                <div
                  className="adm-promotion-preview"
                >
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div className="fw-bold text-dark text-truncate" title={form.name}>
                        {form.name || "Tên mã giảm giá..."}
                      </div>
                      <div
                        className="adm-promotion-preview-value fw-bold my-1"
                      >
                        {previewBadge}
                      </div>
                    </div>
                    <i className="bi bi-ticket-perforated fs-2 text-secondary opacity-75 flex-shrink-0" />
                  </div>

                  <div className="small text-muted mt-2">
                    {form.description || conditionDescription ? (
                      <div className="fw-semibold text-dark mb-1">
                        <i className="bi bi-info-circle text-secondary me-1" />
                        {form.description || conditionDescription}
                      </div>
                    ) : (
                      <div>
                        Đơn tối thiểu {fmtVND(form.min_order_value || 0)}
                        {form.discount_type === "percentage" &&
                          Number(form.max_discount_amount) > 0 && (
                            <> · Tối đa {fmtVND(form.max_discount_amount)}</>
                          )}
                      </div>
                    )}
                    <div className="mt-1">
                      HSD:{" "}
                      {form.start_date || form.end_date
                        ? `${formatDate(form.start_date)} - ${formatDate(form.end_date)}`
                        : "Chưa thiết lập"}
                    </div>
                    {Number(form.per_user_limit) > 0 && (
                      <div className="text-secondary mt-1">
                        Tối đa {form.per_user_limit} lượt/khách hàng
                      </div>
                    )}
                    {Number(form.total_quantity) > 0 && (
                      <div className="text-muted mt-1">
                        Tổng phát hành: {form.total_quantity} mã
                      </div>
                    )}
                  </div>

                  <div className="d-flex justify-content-between align-items-center gap-2 mt-3 pt-2 border-top">
                    <span
                      className="adm-name text-uppercase px-2 py-1 bg-white border rounded"
                    >
                      {form.code || "VOUCHERCODE"}
                    </span>
                    <span
                      className={`adm-status adm-status-wide rounded-pill text-${
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

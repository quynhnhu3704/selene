import EmptyState from "../../../../components/common/EmptyState";
import AdminSelect from "../../components/AdminSelect";
import { DateInput } from "../../../../components/common/DatePicker";
import AdminSaveButton from "../../components/AdminSaveButton";
// frontend/src/pages/Admin/Promotions/components/PromotionPage.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";
import Loading from "../../../../components/common/Loading";
import ProductImage from "../../../../components/common/ProductImage";
import {
  getAdminPromotionDetail,
  createAdminPromotion,
  updateAdminPromotion,
} from "../../../../services/promotion.service";
import { getProducts } from "../../../../services/product.service";
import {
  PRODUCT_PROMOTION_STATUSES,
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

// Helper trích xuất an toàn 1 URL ảnh duy nhất cho sản phẩm
const getFirstImageUrl = (val) => {
  if (!val) return null;
  if (typeof val === "object" && !Array.isArray(val)) {
    return getFirstImageUrl(val.image_url || val.image_urls);
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      const found = getFirstImageUrl(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof val === "string") {
    const s = val.trim();
    if (!s || s === "[" || s === "]" || s === "null" || s === "undefined") {
      return null;
    }
    if (s.startsWith("[") || s.startsWith("{")) {
      try {
        const parsed = JSON.parse(s);
        return getFirstImageUrl(parsed);
      } catch {
        return null;
      }
    }
    const clean = s.replace(/^["']|["']$/g, "").trim();
    return clean.length >= 5 ? clean : null;
  }
  return null;
};

export default function PromotionPage({ create = false }) {
  const { promotionId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const base = "/admin/khuyen-mai/san-pham";
  const requestedReturn = params.get("returnUrl");
  const back =
    requestedReturn === base || requestedReturn?.startsWith(base + "?")
      ? requestedReturn
      : base;

  const title = create ? "Thêm khuyến mãi mới" : "Chỉnh sửa khuyến mãi";

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
    scope_type: "all", // "all" | "specific"
  });

  const [isCustomDesc, setIsCustomDesc] = useState(false);
  const [loading, setLoading] = useState(!create);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actualPromoId, setActualPromoId] = useState(promotionId);

  // Product selection state
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Load promotion details when editing
  useEffect(() => {
    if (create) return;
    let isCurrentRequest = true;

    const loadPromotion = async () => {
      setLoading(true);
      setError("");

      let promoData = null;

      // 1. Try fetching from backend API
      try {
        const res = await getAdminPromotionDetail(promotionId);
        if (res?.data) {
          promoData = res.data;
        }
      } catch (apiErr) {
        console.warn(
          "Không thể tải thông tin khuyến mãi từ API:",
          apiErr.message,
        );
      }

      if (!isCurrentRequest) return;

      if (promoData) {
        const realId =
          promoData.promotion_id || promoData.id || promoData.code || promotionId;
        setActualPromoId(realId);

        const items = Array.isArray(promoData.promotion_items)
          ? promoData.promotion_items
          : [];
        const hasSpecificProducts = items.length > 0;

        if (hasSpecificProducts) {
          const mapped = items
            .map((it) => {
              const p = it.products || {};
              return {
                product_id: it.product_id || p.product_id,
                product_name: p.product_name || `Sản phẩm ${it.product_id}`,
                image_url: getFirstImageUrl(p),
                price: p.price ?? p.original_price ?? 0,
                original_price: p.original_price ?? p.price ?? 0,
                status: it.status || p.status || "active",
              };
            })
            .filter((p) => p.product_id);
          setSelectedProducts(mapped);
        }

        setForm({
          code: promoData.code || promoData.promotion_id || promoData.id || "",
          name: promoData.name || "",
          description: promoData.description || promoData.scope || "",
          discount_type:
            promoData.discount_type === "percent"
              ? "percentage"
              : promoData.discount_type === "fixed"
                ? "fixed_amount"
                : promoData.discount_type || "percentage",
          discount_value: promoData.discount_value ?? "",
          min_order_value:
            promoData.min_order_value ?? promoData.min_order ?? 0,
          max_discount_amount: promoData.max_discount_amount ?? 0,
          total_quantity:
            promoData.total_quantity ??
            promoData.quantity_limit ??
            promoData.max_usage ??
            0,
          per_user_limit: promoData.per_user_limit ?? 1,
          status:
            promoData.status === "locked" || promoData.status === "paused"
              ? "inactive"
              : promoData.status === "depleted"
                ? "out_of_stock"
                : promoData.status === "ended"
                  ? "expired"
                  : promoData.status || "active",
          start_date: formatDateForInput(promoData.start_date),
          end_date: formatDateForInput(promoData.end_date),
          scope_type: hasSpecificProducts ? "specific" : "all",
        });
        if (promoData.description) {
          setIsCustomDesc(true);
        }
      } else {
        setError(
          "Không tìm thấy thông tin chương trình khuyến mãi này hoặc đã bị xóa.",
        );
      }

      setLoading(false);
    };

    loadPromotion();

    return () => {
      isCurrentRequest = false;
    };
  }, [create, promotionId]);

  // Debounce product search for specific products selection
  useEffect(() => {
    if (form.scope_type !== "specific" || !productSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await getProducts({
          q: productSearchQuery.trim(),
          limit: 15,
        });
        const list = res?.data || [];
        setSearchResults(list);
      } catch (err) {
        console.warn("Lỗi tìm kiếm sản phẩm:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [productSearchQuery, form.scope_type]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCurrencyChange = (field, text) => {
    const clean = text.replace(/\D/g, "");
    handleChange(field, clean === "" ? "" : Number(clean));
  };

  const handleAddProduct = (prod) => {
    if (selectedProducts.some((p) => p.product_id === prod.product_id)) {
      toast.info(`Sản phẩm "${prod.product_name}" đã có trong danh sách!`);
      return;
    }
    const newProd = {
      product_id: prod.product_id,
      product_name: prod.product_name,
      image_url: getFirstImageUrl(prod),
      price: prod.price ?? prod.original_price ?? 0,
      original_price: prod.original_price ?? prod.price ?? 0,
      status: prod.status || "active",
    };
    setSelectedProducts((prev) => [...prev, newProd]);
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts((prev) =>
      prev.filter((p) => p.product_id !== productId),
    );
  };

  const handleClearAllProducts = () => {
    setSelectedProducts([]);
  };

  // Tính giá sau giảm trực quan cho từng sản phẩm
  const calculateDiscountedPrice = (price) => {
    const numPrice = Number(price) || 0;
    const numVal = Number(form.discount_value) || 0;
    if (numVal <= 0 || numPrice <= 0) return numPrice;

    if (form.discount_type === "percentage") {
      let discountAmt = (numPrice * numVal) / 100;
      const maxDiscount = Number(form.max_discount_amount) || 0;
      if (maxDiscount > 0) {
        discountAmt = Math.min(discountAmt, maxDiscount);
      }
      return Math.max(0, Math.round(numPrice - discountAmt));
    } else {
      return Math.max(0, Math.round(numPrice - numVal));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!form.code.trim()) {
      toast.warning("Vui lòng nhập mã khuyến mãi!");
      return;
    }
    if (!form.name.trim()) {
      toast.warning("Vui lòng nhập tên chương trình khuyến mãi!");
      return;
    }
    if (form.discount_value === "" || Number(form.discount_value) <= 0) {
      toast.warning("Mức giảm phải lớn hơn 0!");
      return;
    }
    if (
      form.discount_type === "percentage" &&
      Number(form.discount_value) > 100
    ) {
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
    if (form.scope_type === "specific" && selectedProducts.length === 0) {
      toast.warning(
        "Vui lòng chọn ít nhất 1 sản phẩm áp dụng hoặc chuyển sang 'Tất cả sản phẩm'!",
      );
      return;
    }

    const payload = {
      code: form.code.toUpperCase().replace(/\s+/g, ""),
      name: form.name.trim(),
      description: (
        form.description?.trim() ||
        conditionDescription ||
        ""
      ).trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_value: Number(form.min_order_value || 0),
      max_discount_amount:
        form.discount_type === "percentage"
          ? Number(form.max_discount_amount || 0)
          : 0,
      total_quantity: Number(form.total_quantity || 1),
      quantity_limit: Number(form.total_quantity || 0),
      per_user_limit: Number(form.per_user_limit || 1),
      start_date: new Date(`${form.start_date}T00:00:00Z`).toISOString(),
      end_date: new Date(`${form.end_date}T23:59:59Z`).toISOString(),
      status: form.status,
      scope_type: form.scope_type,
      product_ids:
        form.scope_type === "specific"
          ? selectedProducts.map((p) => p.product_id)
          : [],
    };

    try {
      setSaving(true);

      const res = create
        ? await createAdminPromotion(payload)
        : await updateAdminPromotion(actualPromoId || promotionId, payload);
      toast.success(res?.message || "Lưu khuyến mãi thành công!");
      navigate(back);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Đã xảy ra lỗi khi lưu chương trình khuyến mãi!",
      );
    } finally {
      setSaving(false);
    }
  };

  // Preview badge calculation
  const previewBadge = useMemo(() => {
    if (form.discount_type === "percentage") {
      return form.discount_value !== ""
        ? `Giảm ${form.discount_value}%`
        : "Chưa có mức giảm";
    }
    return form.discount_value !== ""
      ? `Giảm ${fmtVND(form.discount_value)}`
      : "Chưa có mức giảm";
  }, [form.discount_type, form.discount_value]);

  // Auto-generate condition description sentence
  const conditionDescription = useMemo(() => {
    const { discount_type, discount_value, max_discount_amount, min_order_value } =
      form;

    const hasDiscount = discount_value !== "" && Number(discount_value) > 0;
    const hasMinOrder = min_order_value !== "" && Number(min_order_value) > 0;
    const hasMaxDiscount =
      discount_type === "percentage" &&
      max_discount_amount !== "" &&
      Number(max_discount_amount) > 0;

    if (!hasDiscount && !hasMinOrder) {
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


      {/* ── PAGE HEADER ── */}
      <div className="adm-form-head adm-page-head">
        <div className="adm-page-title">{title}</div>
        <div className="d-flex gap-2">
          <Link
            to={back}
            className="form-btn btn btn-outline-dark fw-semibold px-3"
          >
            <i className="bi bi-arrow-left me-1" /> Quay lại
          </Link>
          <AdminSaveButton onClick={handleSubmit} disabled={loading} saving={saving}>
            {create ? "Thêm khuyến mãi" : "Lưu thay đổi"}
          </AdminSaveButton>
        </div>
      </div>

      {loading ? (
        <div
          className="d-flex align-items-center justify-content-center"
          style={{ minHeight: "50vh" }}
        >
          <Loading text="Đang tải thông tin khuyến mãi..." />
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
            {/* ══════ CỘT TRÁI: FORM THÔNG TIN ══════ */}
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
                      Mã khuyến mãi <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control text-uppercase"
                      placeholder="VD: KM50K"
                      value={form.code}
                      onChange={(e) =>
                        handleChange(
                          "code",
                          e.target.value.toUpperCase().replace(/\s+/g, ""),
                        )
                      }
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">Trạng thái hoạt động</label>
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
                        Tên chương trình khuyến mãi{" "}
                        <span className="text-danger">*</span>
                      </label>
                      {conditionDescription &&
                        form.name !== conditionDescription && (
                          <button
                            type="button"
                            className="form-link-sm border-0 bg-transparent p-0"
                            onClick={() =>
                              handleChange("name", conditionDescription)
                            }
                            title="Điền tự động từ mô tả điều kiện"
                          >
                            <i className="bi bi-magic me-1" /> Dùng mô tả điều
                            kiện làm tên
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
                      onChange={(e) =>
                        handleChange("discount_type", e.target.value)
                      }
                      disabled={saving}
                    >
                      <option value="percentage">Phần trăm (%)</option>
                      <option value="fixed_amount">Số tiền cố định (VNĐ)</option>
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
                          onChange={(e) =>
                            handleChange("discount_value", e.target.value)
                          }
                          required
                          disabled={saving}
                        />
                      ) : (
                        <input
                          type="text"
                          className="form-control"
                          placeholder="VD: 50.000"
                          value={
                            form.discount_value === ""
                              ? ""
                              : formatNumberVND(form.discount_value)
                          }
                          onChange={(e) =>
                            handleCurrencyChange("discount_value", e.target.value)
                          }
                          required
                          disabled={saving}
                        />
                      )}
                      <span
                        className="input-group-text text-muted"
                      >
                        {form.discount_type === "percentage" ? "%" : "đ"}
                      </span>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">Giảm tối đa (VNĐ)</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={
                          form.discount_type === "percentage"
                            ? "VD: 200.000"
                            : "Không áp dụng"
                        }
                        disabled={form.discount_type !== "percentage" || saving}
                        value={
                          form.discount_type !== "percentage"
                            ? "Không áp dụng"
                            : form.max_discount_amount === ""
                              ? ""
                              : formatNumberVND(form.max_discount_amount)
                        }
                        onChange={(e) =>
                          handleCurrencyChange(
                            "max_discount_amount",
                            e.target.value,
                          )
                        }
                      />
                      <span
                        className="input-group-text text-muted"
                      >
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
                        value={
                          form.min_order_value === ""
                            ? ""
                            : formatNumberVND(form.min_order_value)
                        }
                        onChange={(e) =>
                          handleCurrencyChange("min_order_value", e.target.value)
                        }
                        required
                        disabled={saving}
                      />
                      <span
                        className="input-group-text text-muted"
                      >
                        đ
                      </span>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <label className="form-label mb-0">Mô tả điều kiện</label>
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
                          <i className="bi bi-arrow-counterclockwise me-1" /> Tự
                          động
                        </button>
                      )}
                    </div>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={
                          conditionDescription ||
                          "VD: Giảm 20% tối đa 150k cho đơn từ 700k"
                        }
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
                            navigator.clipboard.writeText(
                              form.description || conditionDescription,
                            );
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
                      onChange={(e) =>
                        handleChange("total_quantity", e.target.value)
                      }
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      Giới hạn / Mỗi khách hàng{" "}
                      <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      placeholder="VD: 1"
                      value={form.per_user_limit}
                      onChange={(e) =>
                        handleChange("per_user_limit", e.target.value)
                      }
                      required
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              {/* KHỐI 4: SẢN PHẨM ÁP DỤNG */}
              <div className="edit-section">
                <div className="edit-section-title justify-content-between flex-wrap">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-box-seam" />
                    <span>Sản phẩm áp dụng</span>
                  </div>
                  {form.scope_type === "specific" && selectedProducts.length > 0 && (
                    <span className="adm-status adm-status-wide rounded-pill bg-secondary-subtle text-secondary">
                      Đã chọn {selectedProducts.length} sản phẩm
                    </span>
                  )}
                </div>

                {/* Chọn phạm vi */}
                <div className="d-flex gap-4 mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="scope_type"
                      id="scope_all"
                      value="all"
                      checked={form.scope_type === "all"}
                      onChange={() => handleChange("scope_type", "all")}
                    />
                    <label
                      className="form-check-label fw-semibold"
                      htmlFor="scope_all"
                    >
                      Tất cả sản phẩm
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="scope_type"
                      id="scope_specific"
                      value="specific"
                      checked={form.scope_type === "specific"}
                      onChange={() => handleChange("scope_type", "specific")}
                    />
                    <label
                      className="form-check-label fw-semibold"
                      htmlFor="scope_specific"
                    >
                      Chỉ định sản phẩm cụ thể
                    </label>
                  </div>
                </div>

                {form.scope_type === "all" ? (
                  <div className="alert alert-light border d-flex align-items-center gap-3 py-3 px-3 mb-0">
                    <i className="bi bi-check-circle-fill text-success fs-4" />
                    <div>
                      Chương trình khuyến mãi này sẽ áp dụng giảm giá cho{" "}
                      <strong>toàn bộ danh mục sản phẩm</strong> đang bán tại hệ thống.
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Thanh tìm kiếm sản phẩm để thêm vào */}
                    <div className="position-relative mb-3">
                      <div className="input-group">
                        <span className="input-group-text bg-white border-end-0">
                          <i className="bi bi-search text-muted" />
                        </span>
                        <input
                          type="text"
                          className="form-control border-start-0"
                          placeholder="Tìm sản phẩm theo tên hoặc mã để thêm vào..."
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                        />
                        {isSearching && (
                          <span className="input-group-text bg-white">
                            <span className="spinner-border spinner-border-sm text-dark" />
                          </span>
                        )}
                      </div>

                      {/* Dropdown kết quả tìm kiếm */}
                      {searchResults.length > 0 && (
                        <div className="promo-prod-search-dropdown p-2 shadow">
                          <div className="d-flex justify-content-between align-items-center px-2 py-1 border-bottom text-muted small">
                            <span>Kết quả tìm kiếm ({searchResults.length})</span>
                            <button
                              type="button"
                              className="form-link-sm border-0 bg-transparent p-0"
                              onClick={() => setSearchResults([])}
                            >
                              Đóng
                            </button>
                          </div>
                          {searchResults.map((prod) => {
                            const isAdded = selectedProducts.some(
                              (p) => p.product_id === prod.product_id,
                            );
                            const imgUrl = getFirstImageUrl(prod);

                            return (
                              <div
                                key={prod.product_id}
                                className="promo-prod-item d-flex align-items-center justify-content-between p-2 rounded gap-2"
                              >
                                <div className="d-flex align-items-center gap-2 overflow-hidden">
                                  <ProductImage
                                    src={imgUrl}
                                    alt=""
                                    className="adm-thumb"
                                  />
                                  <div className="text-truncate">
                                    <div
                                      className="fw-semibold text-dark text-truncate"
                                    >
                                      {prod.product_name}
                                    </div>
                                    <div
                                      className="text-muted small"
                                    >
                                      {fmtVND(prod.price || prod.original_price)}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className={`form-btn btn ${
                                    isAdded
                                      ? "btn-secondary disabled"
                                      : "btn-outline-dark"
                                  } mb-0 flex-shrink-0`}
                                  disabled={isAdded}
                                  onClick={() => handleAddProduct(prod)}
                                >
                                  {isAdded ? "Đã thêm" : "+ Thêm"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Danh sách sản phẩm đã chọn */}
                    {selectedProducts.length === 0 ? (
                      <div className="page-empty py-4">
                        <EmptyState text="Chưa có sản phẩm nào được chọn. Hãy tìm kiếm ở trên để thêm sản phẩm." />
                      </div>
                    ) : (
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small text-muted">
                            Danh sách {selectedProducts.length} sản phẩm áp dụng:
                          </span>
                          <button
                            type="button"
                            className="form-btn btn btn-outline-danger mb-0"
                            onClick={handleClearAllProducts}
                          >
                            <i className="bi bi-trash me-1" /> Xóa tất cả
                          </button>
                        </div>

                        <div
                          className="adm-table-wrap table-responsive"
                          style={{ maxHeight: 320, overflowY: "auto" }}
                        >
                          <table className="table adm-table adm-product-selection-table mb-0">
                            <thead>
                              <tr>
                                <th style={{ width: "6%" }} className="text-center">#</th>
                                <th style={{ width: "44%" }}>Sản phẩm</th>
                                <th style={{ width: "22%" }} className="text-end">Giá gốc</th>
                                <th style={{ width: "20%" }} className="text-end text-success">Giá sau giảm</th>
                                <th style={{ width: "8%" }} className="text-center">Xóa</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedProducts.map((p, idx) => {
                                const origPrice = p.price || p.original_price || 0;
                                const discounted = calculateDiscountedPrice(origPrice);
                                return (
                                  <tr key={p.product_id || idx}>
                                    <td className="text-center text-muted">{idx + 1}</td>
                                    <td>
                                      <div className="d-flex align-items-center gap-2">
                                        <ProductImage
                                          src={p.image_url}
                                          alt=""
                                          className="adm-thumb"
                                        />
                                        <div className="text-truncate fw-semibold text-dark">
                                          {p.product_name}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="text-end text-nowrap">
                                      <span className="text-muted" style={{ textDecoration: discounted < origPrice ? "line-through" : "none" }}>
                                        {fmtVND(origPrice)}
                                      </span>
                                    </td>
                                    <td className="text-end text-nowrap">
                                      <span className="fw-bold text-success">
                                        {fmtVND(discounted)}
                                      </span>
                                    </td>
                                    <td className="text-center">
                                      <button
                                        type="button"
                                        className="adm-action-btn lock"
                                        title="Xóa khỏi chương trình"
                                        onClick={() => handleRemoveProduct(p.product_id)}
                                      >
                                        <i className="bi bi-x-lg" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ══════ CỘT PHẢI: XEM TRƯỚC KHUYẾN MÃI (STICKY) ══════ */}
            <div
              className="col-12 col-xl-4 adm-preview-column"
            >
              {/* PREVIEW CARD */}
              <div className="edit-section">
                <div className="edit-section-title justify-content-between flex-wrap">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-eye" />
                    <span>Xem trước khuyến mãi</span>
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
                      <div
                        className="fw-bold text-dark text-truncate"
                        title={form.name}
                      >
                        {form.name || "Tên chương trình khuyến mãi..."}
                      </div>
                      <div
                        className="adm-promotion-preview-value fw-bold my-1"
                      >
                        {previewBadge}
                      </div>
                    </div>
                    <i className="bi bi-ticket-perforated fs-2 text-secondary opacity-75 flex-shrink-0" />
                  </div>

                  <div
                    className="small text-muted mt-2"
                  >
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
                      <i className="bi bi-box-seam me-1 text-secondary" />
                      Phạm vi:{" "}
                      <span className="fw-semibold text-dark">
                        {form.scope_type === "all"
                          ? "Tất cả sản phẩm"
                          : `${selectedProducts.length} sản phẩm áp dụng`}
                      </span>
                    </div>
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
                      <div
                        className="text-muted mt-1"
                      >
                        Tổng phát hành: {form.total_quantity} mã
                      </div>
                    )}
                  </div>

                  <div className="d-flex justify-content-between align-items-center gap-2 mt-3 pt-2 border-top">
                    <span
                      className="adm-name text-uppercase px-2 py-1 bg-white border rounded"
                    >
                      {form.code || "PROMOTIONCODE"}
                    </span>
                    <span
                      className={`adm-status adm-status-wide rounded-pill text-${
                        PRODUCT_PROMOTION_STATUSES.find(
                          (s) => s.key === form.status,
                        )?.color || "secondary"
                      } bg-${
                        PRODUCT_PROMOTION_STATUSES.find(
                          (s) => s.key === form.status,
                        )?.color || "secondary"
                      }-subtle px-2 py-1`}
                    >
                      {PRODUCT_PROMOTION_STATUSES.find(
                        (s) => s.key === form.status,
                      )?.label || form.status}
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

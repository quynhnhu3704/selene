import AdminSaveButton from "../../components/AdminSaveButton";
import { buildProductFormData } from "./productFormData";
import EmptyState from "../../../../components/common/EmptyState";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Helmet } from "react-helmet-async";
import {
  getAdminProductDetail,
  getAdminProductCategories,
  updateAdminProduct,
  createAdminProduct,
} from "../../../../services/product.service";
import Loading from "../../../../components/common/Loading";
import AdminSelect from "../../components/AdminSelect";

function ProductDropdown({
  id,
  value,
  options,
  placeholder,
  onChange,
  disabled,
}) {
  return (
    <AdminSelect
      id={id}
      aria-label={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </AdminSelect>
  );
}

export default function ProductForm({ mode = "edit" }) {
  const isCreate = mode === "create";
  const pageTitle = isCreate ? "Thêm mới sản phẩm" : "Chỉnh sửa sản phẩm";
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedReturnUrl = new URLSearchParams(location.search).get(
    "returnUrl",
  );
  const returnUrl = /^\/admin\/san-pham(?:\?|$)/.test(requestedReturnUrl || "")
    ? requestedReturnUrl
    : "/admin/san-pham";
  const mainImgRef = useRef(null);
  const moreImgRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [readingImages, setReadingImages] = useState(false);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    discount: "",
    originalPrice: "",
  });
  const [mainImg, setMainImg] = useState("");
  const [thumbs, setThumbs] = useState([]);
  const [variants, setVariants] = useState([]);
  const [product, setProduct] = useState(null);
  const [brandId, setBrandId] = useState("");
  const [category, setCategory] = useState("");

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setVariant = (index, key, val) =>
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== index) return v;
        const updated = { ...v, [key]: val };
        if (
          key === "stock_quantity" &&
          !["inactive", "archived"].includes(v.status)
        ) {
          updated.status = Number(val) === 0 ? "out_of_stock" : "active";
        }
        return updated;
      }),
    );
  const addVariant = () =>
    setVariants((prev) => [
      ...prev,
      { size: "", color: "", stock_quantity: 0, status: "out_of_stock" },
    ]);
  const totalStock = variants.reduce(
    (t, v) => t + (Number(v.stock_quantity) || 0),
    0,
  );

  useEffect(() => {
    let isCurrent = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        if (isCreate) {
          const catRes = await getAdminProductCategories();
          if (!isCurrent) return;
          setCategories(catRes.data || []);
          return;
        }
        const [productRes, catRes] = await Promise.all([
          getAdminProductDetail(productId),
          getAdminProductCategories(),
        ]);
        if (!isCurrent) return;
        const p = productRes.data;
        const cats = catRes.data || [];
        setCategories(
          cats.some((item) => item.category_id === p.category_id) ||
            !p.category_id
            ? cats
            : [
                ...cats,
                {
                  category_id: p.category_id,
                  name: p.category_name || p.category_id,
                },
              ],
        );
        setProduct(p);
        setVariants(p.variants || []);

        setBrandId(p.brand_id || "");

        setForm({
          name: p.product_name || "",
          description: p.description || "",
          basePrice: p.price ?? "",
          discount: p.discount_price ?? "",
          originalPrice: p.original_price ?? "",
        });
        const imgs = p.image_urls || [];
        setMainImg(imgs[0] || "");
        setThumbs(imgs.slice(1));
        setCategory(
          p.category_id ||
            cats.find((c) => c.name === p.category_name)?.category_id ||
            "",
        );
      } catch (err) {
        console.error(err);
        toast.error(isCreate ? "Không thể tải danh mục!" : "Không thể tải thông tin sản phẩm!");
        navigate("/admin/san-pham");
      } finally {
        if (isCurrent) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isCurrent = false;
    };
  }, [productId, navigate, isCreate]);

  const readImage = (file) =>
    new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
        reject(new Error("Vui lòng chọn ảnh không quá 5 MB"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Không thể đọc ảnh đã chọn"));
      reader.readAsDataURL(file);
    });

  const handleMainImg = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      setReadingImages(true);
      setMainImg(await readImage(file));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReadingImages(false);
    }
  };

  const handleMoreImgs = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = "";
    if (!files.length) return;
    if (files.length + thumbs.length + (mainImg ? 1 : 0) > 10) {
      toast.error("Sản phẩm được có tối đa 10 ảnh");
      return;
    }
    try {
      setReadingImages(true);
      const images = await Promise.all(files.map(readImage));
      if (!mainImg) {
        setMainImg(images[0]);
        setThumbs((p) => [...p, ...images.slice(1)]);
      } else {
        setThumbs((p) => [...p, ...images]);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReadingImages(false);
    }
  };

  const removeMainImg = () => {
    setMainImg(thumbs[0] || "");
    setThumbs((p) => p.slice(1));
  };
  const removeThumb = (i) => setThumbs((p) => p.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (submitting || readingImages) return;
    if (!mainImg && thumbs.length === 0) {
      toast.error("Sản phẩm phải có ít nhất một hình ảnh");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên sản phẩm");
      return;
    }
    if (
      [form.basePrice, form.originalPrice].some(
        (value) =>
          String(value).trim() === "" ||
          !Number.isFinite(Number(value)) ||
          Number(value) < 0,
      ) ||
      (form.discount !== "" &&
        (!Number.isFinite(Number(form.discount)) || Number(form.discount) < 0))
    ) {
      toast.error("Giá sản phẩm phải là số không âm");
      return;
    }
    if (form.discount !== "" && Number(form.discount) > Number(form.basePrice)) {
      toast.error("Giá khuyến mãi không được vượt giá bán");
      return;
    }
    if (!category) {
      toast.error("Vui lòng chọn danh mục sản phẩm");
      return;
    }
    if (variants.length === 0) {
      toast.error("Sản phẩm phải có ít nhất một biến thể");
      return;
    }

    const variantKeys = new Set();
    for (const variant of variants) {
      if (!variant.size.trim() || !variant.color.trim() || variant.size.trim().length > 50 || variant.color.trim().length > 50) {
        toast.error("Vui lòng nhập kích thước và màu cho từng biến thể (tối đa 50 ký tự)");
        return;
      }
      const qty = Number(variant.stock_quantity);
      if (
        String(variant.stock_quantity).trim() === "" ||
        !Number.isSafeInteger(qty) ||
        qty < 0 || qty > 2147483647
      ) {
        toast.error("Tồn kho từng biến thể phải là số nguyên không âm");
        return;
      }
      const key = JSON.stringify([
        variant.size.trim().toUpperCase(), variant.color.trim().toUpperCase(),
      ]);
      if (variantKeys.has(key)) {
        toast.error("Không được trùng cặp kích thước và màu giữa các biến thể");
        return;
      }
      if (!isCreate && !variant.variant_id) {
        const generatedId =
          `${(product.brand_name || "SELENE").trim().toUpperCase()}-${productId}-${variant.size.trim()}-${variant.color.trim().toUpperCase()}`.replace(
            /\s+/g,
            "",
          );
        if (variants.some((item) => item.variant_id === generatedId)) {
          toast.error(
            "Kích thước và màu này đã có mã biến thể cũ, vui lòng sửa dòng cũ",
          );
          return;
        }
      }
      variantKeys.add(key);
    }

    try {
      setSubmitting(true);
      const formData = await buildProductFormData({
        form, category, brandId, variants, mainImg, thumbs,
        status: isCreate ? "active" : product.status,
      });

      if (isCreate) {
        await createAdminProduct(formData);
      } else {
        await updateAdminProduct(productId, formData);
      }
      toast.success(isCreate ? "Thêm sản phẩm thành công!" : "Cập nhật sản phẩm thành công!");
      navigate(returnUrl);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          (isCreate ? "Không thể thêm sản phẩm!" : "Không thể cập nhật sản phẩm!"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "60vh" }}
      >
        <Loading text="Đang tải sản phẩm..." />
      </div>
    );
  }

  const actions = (
    <div className="d-flex gap-2">
      <button
        className="form-btn btn btn-outline-dark btn-export mb-0"
        onClick={() => navigate(returnUrl)}
        disabled={submitting}
      >
        <i className="bi bi-arrow-left me-1" /> Quay lại
      </button>
      <AdminSaveButton onClick={handleSubmit} disabled={submitting || readingImages} saving={submitting}>
        {isCreate ? "Thêm sản phẩm" : "Lưu thay đổi"}
      </AdminSaveButton>
    </div>
  );

  /* ─────────────────────────────────────────────────────────
     UI
  ───────────────────────────────────────────────────────── */
  return (
    <>
      <Helmet>
        <title>{pageTitle} | Selene</title>
      </Helmet>

      <div className="ep-page">
        {/* ─── PAGE HEADER ─── */}
        <div className="adm-page-head flex-wrap gap-3">
          <div>
            <h1 className="adm-page-title mb-1">{pageTitle}</h1>
            <span className="adm-sub">{isCreate ? "Nhập thông tin sản phẩm mới" : `Mã sản phẩm: ${productId}`}</span>
          </div>
          {actions}
        </div>

        {/* ─── 2-COLUMN LAYOUT ─── */}
        <div className="row g-4 align-items-start">
          {/* ══════ LEFT COL ══════ */}
          <div className="col-12 col-xl-7">
            {/* THÔNG TIN CHUNG */}
            <div className="edit-section">
              <div className="edit-section-title">
                <i className="bi bi-info-circle" /> Thông tin chung
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="ep-name">
                  Tên sản phẩm <span className="text-danger">*</span>
                </label>
                <input
                  id="ep-name"
                  className="form-control"
                  placeholder="Ví dụ: Áo khoác có túi"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  disabled={submitting}
                  maxLength={120}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="ep-desc">
                  Mô tả sản phẩm
                </label>
                <textarea
                  id="ep-desc"
                  className="form-control"
                  disabled={submitting}
                  rows={5}
                  placeholder="Nhập mô tả chi tiết sản phẩm..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  style={{ resize: "vertical", minHeight: 120 }}
                />
              </div>
            </div>

            {/* BIẾN THỂ */}
            <div className="edit-section">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <div className="edit-section-title mb-0">
                  <i className="bi bi-grid-3x3-gap" /> Biến thể sản phẩm
                </div>
                <button
                  type="button"
                  className="form-btn btn btn-outline-dark mb-0"
                  onClick={addVariant}
                  disabled={submitting}
                >
                  <i className="bi bi-plus-lg me-1" /> Thêm biến thể
                </button>
              </div>

              <p className="adm-sub mb-3">
                Biến thể hết tồn kho tự chuyển sang hết hàng. Dùng trạng thái
                khóa để ngừng bán biến thể đã lưu.
              </p>
              {variants.length === 0 ? (
                <div
                  className="text-center text-muted py-4"
                  style={{ fontSize: 14 }}
                >
                  <EmptyState text="Không có biến thể nào để hiển thị" />
                </div>
              ) : (
                variants.map((variant, index) => (
                <div className="edit-variant" key={variant.variant_id || index}>
                    <div className="row g-3 align-items-end">
                    {/* Size */}
                    <div className="col-6 col-md-3">
                      <label className={`form-label${index > 0 ? " d-md-none" : ""}`} htmlFor={`variant-size-${index}`}>
                        Kích thước <span className="text-danger">*</span>
                      </label>
                      <input
                        id={`variant-size-${index}`}
                        className="form-control"
                        aria-label={`Kích thước biến thể ${index + 1}`}
                        placeholder="S, M, L..."
                        value={variant.size}
                        onChange={(e) =>
                          setVariant(index, "size", e.target.value)
                        }
                        disabled={submitting}
                      />
                    </div>
                    {/* Color */}
                    <div className="col-6 col-md-3">
                      <label className={`form-label${index > 0 ? " d-md-none" : ""}`} htmlFor={`variant-color-${index}`}>
                        Màu sắc <span className="text-danger">*</span>
                      </label>
                      <input
                        id={`variant-color-${index}`}
                        className="form-control"
                        aria-label={`Màu sắc biến thể ${index + 1}`}
                        placeholder="Trắng, Đen..."
                        value={variant.color}
                        onChange={(e) =>
                          setVariant(index, "color", e.target.value)
                        }
                        disabled={submitting}
                      />
                    </div>
                    {/* Stock */}
                    <div className="col-6 col-md-2">
                      <label className={`form-label${index > 0 ? " d-md-none" : ""}`} htmlFor={`variant-stock-${index}`}>
                        Tồn kho <span className="text-danger">*</span>
                      </label>
                      <input
                        id={`variant-stock-${index}`}
                        className="form-control text-center"
                        aria-label={`Tồn kho biến thể ${index + 1}`}
                        type="number"
                        min={0}
                        step={1}
                        value={variant.stock_quantity}
                        onChange={(e) =>
                          setVariant(
                            index,
                            "stock_quantity",
                            e.target.value,
                          )
                        }
                        disabled={submitting}
                      />
                    </div>
                    {/* Status */}
                    <div className="col-6 col-md-3">
                      <label className={`form-label${index > 0 ? " d-md-none" : ""}`} htmlFor={`variant-status-${index}`}>
                        Trạng thái
                      </label>
                      <ProductDropdown
                        id={`variant-status-${index}`}
                        value={variant.status}
                        options={[
                          { value: "active", label: "Hoạt động" },
                          { value: "inactive", label: "Đã khóa" },
                          { value: "out_of_stock", label: "Hết hàng" },
                          {
                            value: "archived",
                            label: "Ngừng kinh doanh",
                          },
                        ]}
                        placeholder="Trạng thái"
                        onChange={(val) =>
                          setVariant(index, "status", val)
                        }
                        disabled={submitting}
                      />
                    </div>
                    {/* Delete — chỉ xoá được dòng mới chưa lưu */}
                    <div className="col-12 col-md-1 d-flex justify-content-end justify-content-md-center">
                      {!variant.variant_id && (
                        <button
                          type="button"
                          className="adm-action-btn text-danger"
                          title="Xoá biến thể"
                          aria-label={`Xoá biến thể ${index + 1}`}
                          onClick={() =>
                            setVariants((p) =>
                              p.filter((_, i) => i !== index),
                            )
                          }
                          disabled={submitting}
                        >
                          <i className="bi bi-trash3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>

            {/* GIÁ & TỒN KHO */}
            <div className="edit-section">
              <div className="edit-section-title">
                <i className="bi bi-tag" /> Giá & tồn kho
              </div>

              <div className="row g-3">
                {/* Giá sản phẩm */}
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="ep-price">
                    Giá bán <span className="text-danger">*</span>
                  </label>
                  <div className="edit-price-input-wrap">
                    <span className="edit-price-unit">₫</span>
                    <input
                      type="number"
                      min="0"
                      id="ep-price"
                      className="form-control"
                      placeholder="Ví dụ: 450000"
                      value={form.basePrice}
                      onChange={(e) => set("basePrice", e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Tổng tồn kho */}
                <div className="col-12 col-md-6">
                  <label className="form-label">Tổng tồn kho</label>
                  <div className="d-flex align-items-center">
                    <div className="edit-stock-badge">
                      <i
                        className="bi bi-box-seam"
                        style={{ fontSize: 14, color: "#6c757d" }}
                      />
                      {totalStock.toLocaleString("vi-VN")}
                      <span
                        style={{
                          fontSize: 11,
                          color: "#6c757d",
                          fontWeight: 600,
                        }}
                      >
                        đơn vị
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9ca0ac",
                      marginTop: 5,
                      fontWeight: 600,
                    }}
                  >
                    Tự tổng hợp từ các biến thể
                  </div>
                </div>

                {/* Giá khuyến mãi */}
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="ep-discount">
                    Giá khuyến mãi
                  </label>
                  <div className="edit-price-input-wrap">
                    <span className="edit-price-unit">₫</span>
                    <input
                      type="number"
                      min="0"
                      id="ep-discount"
                      className="form-control"
                      placeholder="Để trống nếu không giảm giá"
                      value={form.discount}
                      onChange={(e) => set("discount", e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="ep-original-price">
                    Giá gốc <span className="text-danger">*</span>
                  </label>
                  <div className="edit-price-input-wrap">
                    <span className="edit-price-unit">₫</span>
                    <input
                      id="ep-original-price"
                      type="number"
                      min="0"
                      className="form-control"
                      value={form.originalPrice}
                      onChange={(e) => set("originalPrice", e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════ RIGHT COL ══════ */}
          <div className="col-12 col-xl-5">
            {/* HÌNH ẢNH */}
            <div className="edit-section">
              <div className="edit-section-title">
                <i className="bi bi-images" /> Hình ảnh sản phẩm
              </div>

              {/* Ảnh chính */}
              {mainImg ? (
                <img src={mainImg} alt="Ảnh chính" className="edit-main-img" />
              ) : (
                <div className="edit-img-placeholder">
                  <i className="bi bi-cloud-arrow-up" />
                  <span>Chưa có ảnh sản phẩm</span>
                </div>
              )}

              {/* Action buttons ảnh chính */}
              <div className="d-flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  className="form-btn btn btn-outline-dark mb-0"
                  onClick={() => mainImgRef.current.click()}
                  disabled={submitting || readingImages}
                >
                  <i className="bi bi-upload" />
                  {mainImg ? "Thay ảnh chính" : "Tải ảnh lên"}
                </button>
                {mainImg && (
                  <button
                    type="button"
                    className="form-btn btn btn-outline-dark mb-0"
                    onClick={removeMainImg}
                    disabled={submitting || readingImages}
                  >
                    <i className="bi bi-trash3" /> Xoá
                  </button>
                )}
              </div>
              <input
                ref={mainImgRef}
                type="file"
                accept="image/*"
                className="d-none"
                onChange={handleMainImg}
                disabled={submitting || readingImages}
              />

              {/* Thumbnail grid */}
              {thumbs.length > 0 && (
                <div className="edit-thumb-grid">
                  {thumbs.map((src, i) => (
                    <div className="edit-thumb" key={i}>
                      <img
                        src={src}
                        alt={`Ảnh phụ ${i + 1}`}
                      />
                      <button
                        type="button"
                        className="edit-thumb-del"
                        title="Xoá ảnh"
                        aria-label={`Xoá ảnh phụ ${i + 1}`}
                        onClick={() => removeThumb(i)}
                        disabled={submitting || readingImages}
                      >
                        <i className="bi bi-x" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Thêm ảnh phụ */}
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="form-btn btn btn-outline-dark mb-0"
                  onClick={() => moreImgRef.current.click()}
                  disabled={
                    submitting ||
                    readingImages ||
                    thumbs.length + (mainImg ? 1 : 0) >= 10
                  }
                  style={{ marginTop: 0 }}
                >
                  <i className="bi bi-plus-lg" /> Thêm ảnh phụ
                </button>
                <div
                  style={{
                    fontSize: 12,
                    color: "#9ca0ac",
                    fontWeight: 600,
                    marginTop: 8,
                  }}
                >
                  {readingImages
                    ? "Đang đọc ảnh..."
                    : `${thumbs.length + (mainImg ? 1 : 0)}/10 ảnh · Mỗi ảnh tối đa 5 MB`}
                </div>
              </div>
              <input
                ref={moreImgRef}
                type="file"
                accept="image/*"
                multiple
                className="d-none"
                onChange={handleMoreImgs}
                disabled={submitting || readingImages}
              />
            </div>

            {/* DANH MỤC */}
            <div className="edit-section">
              <div className="edit-section-title">
                <i className="bi bi-folder2-open" /> Danh mục
              </div>

              <label className="form-label" htmlFor="product-category">
                Danh mục sản phẩm <span className="text-danger">*</span>
              </label>
              <ProductDropdown
                id="product-category"
                value={category}
                options={categories.map((c) => ({
                  value: c.category_id,
                  label: c.name,
                }))}
                placeholder="Chọn danh mục"
                onChange={setCategory}
                disabled={submitting}
              />
            </div>

            {/* TRẠNG THÁI HIỆN TẠI (read-only info) */}
            {product && (
              <div className="edit-section">
                <div className="edit-section-title">
                  <i className="bi bi-activity" /> Trạng thái sản phẩm
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <span
                    style={{ fontSize: 14, color: "#6c757d", fontWeight: 600 }}
                  >
                    Trạng thái hiện tại
                  </span>
                  <span
                    className={`adm-status rounded-pill ${product.status === "active" ? "text-success bg-success-subtle" : "text-danger bg-danger-subtle"}`}
                  >
                    {product.status === "active" ? "Hoạt động" : "Đã khoá"}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 12,
                    color: "#9ca0ac",
                    fontWeight: 600,
                    lineHeight: 1.6,
                  }}
                >
                  Để thay đổi trạng thái, quay lại danh sách sản phẩm và dùng
                  nút khoá / mở khoá.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

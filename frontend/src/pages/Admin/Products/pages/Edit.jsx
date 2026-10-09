// frontend\src\pages\Admin\Products\pages\Edit.jsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Helmet } from "react-helmet-async";
import {
  getAdminProductDetail,
  getAdminProductCategories,
  updateAdminProduct,
} from "../../../../services/product.service";
import http from "../../../../services/http";
import Loading from "../../../../components/common/Loading";

const DISCOUNT_TYPES = [
  "Không giảm giá",
  "Giảm giá theo mùa",
  "Giảm giá chớp nhoáng",
  "Giảm giá Tết Nguyên đán",
  "Xả hàng cuối năm",
  "Giảm giá thành viên",
];

function ProductDropdown({
  id,
  value,
  options,
  placeholder,
  onChange,
  disabled,
}) {
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handleClose = (e) => {
      if (e.type === "keydown") {
        if (e.key !== "Escape") return;
        setOpen(false);
        buttonRef.current?.focus();
      } else if (!dropdownRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClose);
    document.addEventListener("focusin", handleClose);
    document.addEventListener("keydown", handleClose);
    return () => {
      document.removeEventListener("mousedown", handleClose);
      document.removeEventListener("focusin", handleClose);
      document.removeEventListener("keydown", handleClose);
    };
  }, [open]);

  return (
    <div className="dropdown" ref={dropdownRef}>
      <button
        id={id}
        ref={buttonRef}
        type="button"
        className="form-control text-start d-flex justify-content-between align-items-center gap-2"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        aria-controls={`${id}-options`}
        disabled={disabled}
      >
        <span className="text-truncate">{selected?.label || placeholder}</span>
        <i
          className={`bi ${open ? "bi-caret-up" : "bi-caret-down"} flex-shrink-0`}
        />
      </button>
      {open && !disabled && (
        <ul
          id={`${id}-options`}
          className="dropdown-menu show w-100 mt-1 shadow-sm"
        >
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                className="dropdown-item fw-normal text-wrap"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function EditProduct() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnUrl =
    new URLSearchParams(location.search).get("returnUrl") || "/admin/san-pham";
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
    discountType: "Không giảm giá",
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
      prev.map((v, i) => (i === index ? { ...v, [key]: val } : v)),
    );
  const addVariant = () =>
    setVariants((prev) => [
      ...prev,
      { size: "", color: "", stock_quantity: 0, status: "active" },
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
        const [productRes, catRes] = await Promise.all([
          getAdminProductDetail(productId),
          getAdminProductCategories(),
        ]);
        if (!isCurrent) return;
        const p = productRes.data;
        const cats = catRes.data || [];
        setCategories(cats);
        setProduct(p);
        setVariants(p.variants || []);

        let matchedBrandId = p.brand_id || "";
        if (!matchedBrandId && p.brand_name) {
          let page = 1,
            totalPages = 1;
          do {
            const res = await http.get("/products/manage/brands", {
              params: { page, limit: 100 },
            });
            if (!isCurrent) return;
            const matches = (res.data.data || []).filter(
              (b) => b.name === p.brand_name,
            );
            if (matches.length === 1) matchedBrandId = matches[0].brand_id;
            totalPages = res.data.pagination?.totalPages || 1;
            page += 1;
          } while (!matchedBrandId && page <= totalPages);
        }
        setBrandId(matchedBrandId);

        setForm({
          name: p.product_name || "",
          description: p.description || "",
          basePrice: p.price ?? "",
          discount: p.discount_price ? String(p.discount_price) : "",
          discountType: "Không giảm giá",
        });
        const imgs = p.image_urls || [];
        if (imgs.length > 0) {
          setMainImg(imgs[0]);
          setThumbs(imgs.slice(1));
        }
        setCategory(
          p.category_id ||
            cats.find((c) => c.name === p.category_name)?.category_id ||
            "",
        );
      } catch (err) {
        console.error(err);
        toast.error("Không thể tải thông tin sản phẩm!");
        navigate("/admin/san-pham");
      } finally {
        if (isCurrent) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isCurrent = false;
    };
  }, [productId, navigate]);

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
    if (!form.basePrice) {
      toast.error("Vui lòng nhập giá sản phẩm");
      return;
    }
    if (!brandId || !category) {
      toast.error("Không xác định được thương hiệu hoặc danh mục sản phẩm");
      return;
    }
    if (variants.length === 0) {
      toast.error("Sản phẩm phải có ít nhất một biến thể");
      return;
    }

    const variantKeys = new Set();
    for (const variant of variants) {
      if (!variant.size.trim() || !variant.color.trim()) {
        toast.error("Vui lòng nhập kích thước và màu cho từng biến thể");
        return;
      }
      const qty = Number(variant.stock_quantity);
      if (
        String(variant.stock_quantity).trim() === "" ||
        !Number.isSafeInteger(qty) ||
        qty < 0
      ) {
        toast.error("Tồn kho từng biến thể phải là số nguyên không âm");
        return;
      }
      const key =
        `${variant.size.trim()}-${variant.color.trim().toUpperCase()}`.replace(
          /\s+/g,
          "",
        );
      if (variantKeys.has(key)) {
        toast.error("Không được trùng cặp kích thước và màu giữa các biến thể");
        return;
      }
      if (!variant.variant_id) {
        const generatedId =
          `${product.brand_name.trim().toUpperCase()}-${productId}-${key}`.replace(
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
      const formData = new FormData();
      formData.append("product_name", form.name);
      formData.append("description", form.description);
      formData.append("price", form.basePrice);
      formData.append(
        "original_price",
        product.original_price ?? form.basePrice,
      );
      formData.append("status", product.status);
      formData.append("discount_price", form.discount || 0);
      formData.append("category_id", category);
      formData.append("brand_id", brandId);

      const variantsPayload = variants.map((v) => ({
        ...(v.variant_id ? { variant_id: v.variant_id } : {}),
        size: v.size.trim(),
        color: v.color.trim(),
        stock_quantity: Number(v.stock_quantity),
        status: v.status,
      }));
      formData.append("variants", JSON.stringify(variantsPayload));

      const images = [mainImg, ...thumbs].filter(Boolean);
      const firstNewImage = images.findIndex((img) => img.startsWith("data:"));
      const oldImages =
        firstNewImage === -1 ? images : images.slice(0, firstNewImage);
      const uploadImages =
        firstNewImage === -1 ? [] : images.slice(firstNewImage);
      formData.append("old_image_urls", JSON.stringify(oldImages));

      for (const [index, imageUrl] of uploadImages.entries()) {
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error("Không thể đọc ảnh để lưu sản phẩm");
        const blob = await res.blob();
        formData.append("images", blob, `product_${Date.now()}_${index}.jpg`);
      }

      await updateAdminProduct(productId, formData);
      toast.success("Cập nhật sản phẩm thành công!");
      navigate("/admin/san-pham");
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Không thể cập nhật sản phẩm!",
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

  /* ─────────────────────────────────────────────────────────
     UI
  ───────────────────────────────────────────────────────── */
  return (
    <>
      <Helmet>
        <title>Chỉnh sửa sản phẩm | Selene</title>
      </Helmet>

      <style>{`
        /* ── SECTION CARD ── */
        .ep-card {
          background: #fff;
          border: 1px solid #efefed;
          border-radius: 16px;
          padding: 24px 24px 20px;
          margin-bottom: 20px;
        }
        .ep-card-title {
          font-size: 14px;
          font-weight: 800;
          color: #17151F;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ep-card-title i { font-size: 15px; color: #6c757d; }

        /* ── MAIN IMAGE ── */
        .ep-main-img {
          width: 100%;
          aspect-ratio: 4 / 3;
          object-fit: cover;
          border-radius: 12px;
          display: block;
          background: #f5f5f5;
        }
        .ep-img-placeholder {
          width: 100%; aspect-ratio: 4/3;
          border: 2px dashed #dee2e6;
          border-radius: 12px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          color: #adb5bd; gap: 8px;
        }
        .ep-img-placeholder i { font-size: 36px; }
        .ep-img-placeholder span { font-size: 13px; font-weight: 600; }

        /* ── THUMB GRID ── */
        .ep-thumb-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 12px;
        }
        .ep-thumb-wrap { position: relative; }
        .ep-thumb-img {
          width: 100%; aspect-ratio: 1;
          object-fit: cover;
          border-radius: 10px;
          display: block;
          border: 1.5px solid #efefed;
        }
        .ep-thumb-del {
          position: absolute; top: 5px; right: 5px;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: rgba(0,0,0,0.55);
          border: none;
          color: #fff;
          font-size: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.15s;
          line-height: 1;
        }
        .ep-thumb-del:hover { background: #dc2626; }

        /* ── IMAGE ACTION BUTTONS ── */
        .ep-img-actions {
          display: flex; gap: 8px; flex-wrap: wrap;
          margin-top: 14px;
        }
        .ep-img-btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 36px; padding: 0 14px;
          border-radius: 9px; border: 1.5px solid #dee2e6;
          background: #fff; color: #212529;
          font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
          font-family: inherit;
          white-space: nowrap;
        }
        .ep-img-btn:hover:not(:disabled) { border-color: #212529; background: #f8f9fa; }
        .ep-img-btn.primary { background: #212529; color: #fff; border-color: #212529; }
        .ep-img-btn.primary:hover:not(:disabled) { opacity: 0.85; background: #212529; }
        .ep-img-btn.danger:hover:not(:disabled) { border-color: #dc2626; color: #dc2626; background: #fff5f5; }
        .ep-img-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── VARIANT TABLE ── */
        .ep-variant-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .ep-variant-table th {
          font-size: 12px; font-weight: 700; color: #6c757d;
          text-transform: uppercase; letter-spacing: 0.5px;
          padding: 8px 10px; border-bottom: 1px solid #efefed;
          background: #fafafa; white-space: nowrap;
        }
        .ep-variant-table th:first-child { border-radius: 8px 0 0 0; }
        .ep-variant-table th:last-child  { border-radius: 0 8px 0 0; }
        .ep-variant-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #f5f5f5;
          vertical-align: middle;
          font-size: 13.5px;
        }
        .ep-variant-table tbody tr:last-child td { border-bottom: none; }
        .ep-variant-table .form-control { font-size: 13.5px; padding: 6px 10px; height: 36px; }
        .ep-variant-table .dropdown button.form-control { height: 36px; font-size: 13.5px; padding: 0 10px; }
        .ep-del-variant {
          width: 30px; height: 30px; border-radius: 8px;
          background: none; border: 1px solid #dee2e6;
          color: #6c757d; font-size: 13px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.15s;
        }
        .ep-del-variant:hover { border-color: #dc2626; color: #dc2626; background: #fff5f5; }

        /* ── STATUS BADGE ── */
        .ep-status-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px;
          font-size: 12px; font-weight: 700;
        }
        .ep-status-badge.active   { background: #f0fdf4; color: #16a34a; }
        .ep-status-badge.inactive { background: #fff5f5; color: #dc2626; }
        .ep-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

        /* ── PRICING INPUTS ── */
        .ep-price-input-wrap { position: relative; }
        .ep-price-input-wrap input { padding-left: 42px; }
        .ep-price-unit {
          position: absolute; left: 0; top: 0; bottom: 0;
          width: 38px;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #6c757d;
          border-right: 1px solid #dee2e6; pointer-events: none;
        }
        .ep-stock-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: #f8f9fa; border: 1px solid #dee2e6;
          border-radius: 8px; padding: 6px 12px;
          font-size: 14px; font-weight: 700; color: #212529;
          height: 38px;
        }
      `}</style>

      {/* ─── PAGE HEADER ─── */}
      <div className="adm-page-head">
        <div className="adm-page-title">Chỉnh sửa sản phẩm</div>
        <div className="d-flex gap-2">
          <button
            className="form-btn btn btn-outline-dark btn-export mb-0"
            onClick={() => navigate(returnUrl)}
            disabled={submitting}
          >
            <i className="bi bi-arrow-left me-1" /> Quay lại
          </button>
          <button
            className="form-btn btn btn-dark mb-0"
            onClick={handleSubmit}
            disabled={submitting || readingImages}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" /> Đang
                lưu...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg me-1" /> Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── 2-COLUMN LAYOUT ─── */}
      <div className="row g-4 align-items-start">
        {/* ══════ LEFT COL ══════ */}
        <div className="col-12 col-xl-7">
          {/* THÔNG TIN CHUNG */}
          <div className="ep-card">
            <div className="ep-card-title">
              <i className="bi bi-info-circle" /> Thông tin chung
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="ep-name">
                Tên sản phẩm
              </label>
              <input
                id="ep-name"
                className="form-control"
                placeholder="Ví dụ: Áo khoác có túi"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
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
                rows={5}
                placeholder="Nhập mô tả chi tiết sản phẩm..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                style={{ resize: "vertical", minHeight: 120 }}
              />
            </div>
          </div>

          {/* BIẾN THỂ */}
          <div className="ep-card">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="ep-card-title mb-0">
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

            {variants.length === 0 ? (
              <div
                className="text-center text-muted py-4"
                style={{ fontSize: 14 }}
              >
                <i
                  className="bi bi-grid-3x3-gap"
                  style={{
                    fontSize: 28,
                    display: "block",
                    marginBottom: 8,
                    opacity: 0.3,
                  }}
                />
                Chưa có biến thể nào
              </div>
            ) : (
              <div className="table-responsive">
                <table className="ep-variant-table">
                  <thead>
                    <tr>
                      <th>Kích thước</th>
                      <th>Màu sắc</th>
                      <th style={{ width: 90 }}>Tồn kho</th>
                      <th style={{ width: 160 }}>Trạng thái</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((variant, index) => (
                      <tr key={variant.variant_id || index}>
                        {/* Size */}
                        <td>
                          <input
                            className="form-control"
                            placeholder="S, M, L..."
                            value={variant.size}
                            onChange={(e) =>
                              setVariant(index, "size", e.target.value)
                            }
                            disabled={submitting}
                          />
                        </td>
                        {/* Color */}
                        <td>
                          <input
                            className="form-control"
                            placeholder="Trắng, Đen..."
                            value={variant.color}
                            onChange={(e) =>
                              setVariant(index, "color", e.target.value)
                            }
                            disabled={submitting}
                          />
                        </td>
                        {/* Stock */}
                        <td>
                          <input
                            className="form-control text-center"
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
                        </td>
                        {/* Status */}
                        <td>
                          <ProductDropdown
                            id={`variant-status-${index}`}
                            value={variant.status}
                            options={[
                              { value: "active", label: "Hoạt động" },
                              { value: "inactive", label: "Ngừng hoạt động" },
                            ]}
                            placeholder="Trạng thái"
                            onChange={(val) => setVariant(index, "status", val)}
                            disabled={submitting}
                          />
                        </td>
                        {/* Delete — chỉ xoá được dòng mới chưa lưu */}
                        <td>
                          {!variant.variant_id && (
                            <button
                              type="button"
                              className="ep-del-variant"
                              title="Xoá biến thể"
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* GIÁ & TỒN KHO */}
          <div className="ep-card">
            <div className="ep-card-title">
              <i className="bi bi-tag" /> Giá & tồn kho
            </div>

            <div className="row g-3">
              {/* Giá sản phẩm */}
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="ep-price">
                  Giá bán
                </label>
                <div className="ep-price-input-wrap">
                  <span className="ep-price-unit">₫</span>
                  <input
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
                  <div className="ep-stock-badge">
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
                <div className="ep-price-input-wrap">
                  <span className="ep-price-unit">₫</span>
                  <input
                    id="ep-discount"
                    className="form-control"
                    placeholder="Để trống nếu không giảm giá"
                    value={form.discount}
                    onChange={(e) => set("discount", e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Loại giảm giá */}
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="discount-type">
                  Loại giảm giá
                </label>
                <ProductDropdown
                  id="discount-type"
                  value={form.discountType}
                  options={DISCOUNT_TYPES.map((t) => ({ value: t, label: t }))}
                  placeholder="Chọn loại giảm giá"
                  onChange={(val) => set("discountType", val)}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ══════ RIGHT COL ══════ */}
        <div className="col-12 col-xl-5">
          {/* HÌNH ẢNH */}
          <div className="ep-card">
            <div className="ep-card-title">
              <i className="bi bi-images" /> Hình ảnh sản phẩm
            </div>

            {/* Ảnh chính */}
            {mainImg ? (
              <img src={mainImg} alt="Ảnh chính" className="ep-main-img" />
            ) : (
              <div className="ep-img-placeholder">
                <i className="bi bi-cloud-arrow-up" />
                <span>Chưa có ảnh sản phẩm</span>
              </div>
            )}

            {/* Action buttons ảnh chính */}
            <div className="ep-img-actions">
              <button
                type="button"
                className={`ep-img-btn${mainImg ? "" : " primary"}`}
                onClick={() => mainImgRef.current.click()}
                disabled={submitting || readingImages}
              >
                <i className="bi bi-upload" />
                {mainImg ? "Thay ảnh chính" : "Tải ảnh lên"}
              </button>
              {mainImg && (
                <button
                  type="button"
                  className="ep-img-btn danger"
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
              <div className="ep-thumb-grid">
                {thumbs.map((src, i) => (
                  <div className="ep-thumb-wrap" key={i}>
                    <img
                      src={src}
                      alt={`Ảnh phụ ${i + 1}`}
                      className="ep-thumb-img"
                    />
                    <button
                      type="button"
                      className="ep-thumb-del"
                      title="Xoá ảnh"
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
            <div style={{ marginTop: thumbs.length > 0 ? 14 : 0 }}>
              <button
                type="button"
                className="ep-img-btn"
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
          <div className="ep-card">
            <div className="ep-card-title">
              <i className="bi bi-folder2-open" /> Danh mục
            </div>

            <label className="form-label" htmlFor="product-category">
              Danh mục sản phẩm
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
            <div className="ep-card">
              <div className="ep-card-title">
                <i className="bi bi-activity" /> Trạng thái sản phẩm
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <span
                  style={{ fontSize: 14, color: "#6c757d", fontWeight: 600 }}
                >
                  Trạng thái hiện tại
                </span>
                <span
                  className={`ep-status-badge ${product.status === "active" ? "active" : "inactive"}`}
                >
                  <span className="ep-status-dot" />
                  {product.status === "active" ? "Đang hoạt động" : "Đã khoá"}
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
                Để thay đổi trạng thái, quay lại danh sách sản phẩm và dùng nút
                khoá / mở khoá.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

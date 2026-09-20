// frontend/src/pages/Admin/Products/pages/Edit.jsx
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

// Dùng dropdown Bootstrap chung, đóng khi bấm ngoài hoặc nhấn Escape.
function ProductDropdown({ id, value, options, placeholder, onChange, disabled }) {
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    // Đóng danh sách và trả focus về nút khi nhấn Escape.
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
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={`${id}-options`}
        disabled={disabled}
      >
        <span>{selected?.label || placeholder}</span>
        <i className={`bi ${open ? "bi-caret-up" : "bi-caret-down"}`} />
      </button>
      {open && !disabled && (
        <ul id={`${id}-options`} className="dropdown-menu show w-100 mt-1 shadow-sm">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className="dropdown-item fw-normal text-wrap"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
              >
                {option.label}
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

  /* ── form state ── */
  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    discount: "",
    discountType: "Không giảm giá",
  });

  /* ── image state ── */
  const [mainImg, setMainImg] = useState("");
  const [thumbs, setThumbs] = useState([]); // Chứa cả URL chuỗi hoặc File mới
  const [variants, setVariants] = useState([]);
  const [product, setProduct] = useState(null);
  const [brandId, setBrandId] = useState("");

  /* ── category ── */
  const [category, setCategory] = useState("");
  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  // Cập nhật riêng từng biến thể, giữ nguyên ID để BE upsert đúng hàng cũ.
  const setVariant = (index, key, val) => {
    setVariants((prev) =>
      prev.map((variant, i) =>
        i === index ? { ...variant, [key]: val } : variant,
      ),
    );
  };

  // Thêm cặp size/màu mới; BE tự tạo ID khi lưu.
  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { size: "", color: "", stock_quantity: 0, status: "active" },
    ]);
  };

  // Tổng tồn kho lấy từ các biến thể, giống danh sách sản phẩm của BE.
  const totalStock = variants.reduce(
    (total, variant) => total + (Number(variant.stock_quantity) || 0),
    0,
  );

  useEffect(() => {
    let isCurrent = true;
    // Tải sản phẩm và đối chiếu ID danh mục, thương hiệu khi cập nhật.
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

        // API chi tiết chỉ trả tên thương hiệu; tìm ID thật để giữ thương hiệu cũ.
        let matchedBrandId = p.brand_id || "";
        if (!matchedBrandId && p.brand_name) {
          let page = 1;
          let totalPages = 1;
          do {
            const res = await http.get("/products/manage/brands", {
              params: { page, limit: 100 },
            });
            if (!isCurrent) return;
            const matches = (res.data.data || []).filter(
              (brand) => brand.name === p.brand_name,
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

        // API chi tiết trả tên danh mục, đối chiếu danh sách để lấy ID tương ứng.
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

  // Đọc ảnh xem trước, giới hạn dung lượng theo API upload của BE.
  const readImage = (file) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
        reject(new Error("Vui lòng chọn ảnh không quá 5 MB"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Không thể đọc ảnh đã chọn"));
      reader.readAsDataURL(file);
    });
  };

  // Thay ảnh chính bằng ảnh vừa tải lên.
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

  // Thêm ảnh phụ theo đúng thứ tự chọn, tối đa 10 ảnh mỗi sản phẩm.
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
        setThumbs((prev) => [...prev, ...images.slice(1)]);
      } else {
        setThumbs((prev) => [...prev, ...images]);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReadingImages(false);
    }
  };

  // Xóa ảnh chính và đưa ảnh phụ đầu tiên lên thay thế.
  const removeMainImg = () => {
    setMainImg(thumbs[0] || "");
    setThumbs((prev) => prev.slice(1));
  };

  // Xóa ảnh phụ khỏi danh sách ảnh giữ lại khi lưu.
  const removeThumb = (index) => {
    setThumbs((prev) => prev.filter((_, i) => i !== index));
  };

  // Kiểm tra từng cặp size/màu và gửi nguyên ID, tồn kho, trạng thái cho BE.
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
      const quantity = Number(variant.stock_quantity);
      if (
        String(variant.stock_quantity).trim() === "" ||
        !Number.isSafeInteger(quantity) ||
        quantity < 0
      ) {
        toast.error("Tồn kho từng biến thể phải là số nguyên không âm");
        return;
      }
      // Chuẩn hóa theo cách BE tạo ID để tránh trùng biến thể mới.
      const key = `${variant.size.trim()}-${variant.color.trim().toUpperCase()}`
        .replace(/\s+/g, "");
      if (variantKeys.has(key)) {
        toast.error("Không được trùng cặp kích thước và màu giữa các biến thể");
        return;
      }
      // Tránh ID tự sinh ghi đè hàng cũ đã đổi size hoặc màu.
      if (!variant.variant_id) {
        const generatedId =
          `${product.brand_name.trim().toUpperCase()}-${productId}-${key}`.replace(
            /\s+/g,
            "",
          );
        if (variants.some((item) => item.variant_id === generatedId)) {
          toast.error("Kích thước và màu này đã có mã biến thể cũ, vui lòng sửa dòng cũ");
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
      formData.append("original_price", product.original_price ?? form.basePrice);
      formData.append("status", product.status);
      formData.append("discount_price", form.discount || 0);
      formData.append("category_id", category);
      formData.append("brand_id", brandId);

      const variantsPayload = variants.map((variant) => ({
        ...(variant.variant_id ? { variant_id: variant.variant_id } : {}),
        size: variant.size.trim(),
        color: variant.color.trim(),
        stock_quantity: Number(variant.stock_quantity),
        status: variant.status,
      }));
      formData.append("variants", JSON.stringify(variantsPayload));

      // BE ghép ảnh cũ trước ảnh tải lên; tải lại phần sau ảnh mới để giữ đúng thứ tự.
      const images = [mainImg, ...thumbs].filter(Boolean);
      const firstNewImage = images.findIndex((img) => img.startsWith("data:"));
      const oldImages = firstNewImage === -1 ? images : images.slice(0, firstNewImage);
      const uploadImages = firstNewImage === -1 ? [] : images.slice(firstNewImage);
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
        err.response?.data?.message || err.message || "Không thể cập nhật sản phẩm!",
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

  return (
    <>
      <Helmet>
        <title>Chỉnh sửa sản phẩm | Selene</title>
      </Helmet>

      {/* ── PAGE HEADER ── */}
      <div className="adm-page-head">
        <div className="adm-page-title">
          <i className="bi bi-pencil-square" />
          Chỉnh sửa sản phẩm
        </div>
        <div className="d-flex gap-2">
          <button className="form-btn btn btn-outline-dark btn-export mb-0" onClick={() => navigate(returnUrl)}>
            <i className="bi bi-arrow-left" /> Quay lại
          </button>
          <button
            className="form-btn btn btn-dark mb-0"
            onClick={handleSubmit}
            disabled={submitting || readingImages}
          >
            {submitting ? (
              <span className="spinner-border spinner-border-sm me-1" />
            ) : (
              <i className="bi bi-check-lg" />
            )}
            Lưu thay đổi
          </button>
        </div>
      </div>

      {/* ── 2-COLUMN LAYOUT ── */}
      <div className="row g-4 align-items-start">
        {/* ════════ LEFT COL ════════ */}
        <div className="col-12 col-xl-7">
          {/* GENERAL INFORMATION */}
          <div className="border rounded-4 bg-white p-4 mb-4">
            <div className="fw-bold mb-3">Thông tin chung</div>

            {/* Name */}
            <div className="mb-3">
              <label className="form-label">Tên sản phẩm</label>
              <input
                className="form-control"
                placeholder="Ví dụ: Áo khoác có túi"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={120}
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="form-label">Mô tả sản phẩm</label>
              <textarea
                className="form-control"
                rows={5}
                placeholder="Nhập mô tả chi tiết sản phẩm..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </div>

          {/* // Quản lý tồn kho theo từng cặp size/màu, khóa hàng cũ thay vì xóa. */}
          <div className="border rounded-4 bg-white p-4 mb-4">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
              <div className="fw-bold">Biến thể</div>
              <button
                type="button"
                className="form-btn btn btn-outline-dark mb-0"
                onClick={addVariant}
                disabled={submitting}
              >
                <i className="bi bi-plus-lg me-2" /> Thêm biến thể
              </button>
            </div>
            {variants.map((variant, index) => (
              <div
                key={variant.variant_id || index}
                className="row g-3 border-bottom pb-3 mb-3"
              >
                <div className="col-6">
                  <label
                    className="form-label"
                    htmlFor={`variant-size-${index}`}
                  >
                    Kích thước
                  </label>
                  <input
                    id={`variant-size-${index}`}
                    className="form-control"
                    value={variant.size}
                    onChange={(e) => setVariant(index, "size", e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label
                    className="form-label"
                    htmlFor={`variant-color-${index}`}
                  >
                    Màu sắc
                  </label>
                  <input
                    id={`variant-color-${index}`}
                    className="form-control"
                    value={variant.color}
                    onChange={(e) => setVariant(index, "color", e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label
                    className="form-label"
                    htmlFor={`variant-stock-${index}`}
                  >
                    Tồn kho
                  </label>
                  <input
                    id={`variant-stock-${index}`}
                    className="form-control"
                    type="number"
                    min={0}
                    step={1}
                    value={variant.stock_quantity}
                    onChange={(e) =>
                      setVariant(index, "stock_quantity", e.target.value)
                    }
                  />
                </div>
                <div className="col-6">
                  <label
                    className="form-label"
                    htmlFor={`variant-status-${index}`}
                  >
                    Trạng thái
                  </label>
                  <ProductDropdown
                    id={`variant-status-${index}`}
                    value={variant.status}
                    options={[
                      { value: "active", label: "Đang hoạt động" },
                      { value: "inactive", label: "Ngừng hoạt động" },
                    ]}
                    placeholder="Trạng thái khác"
                    onChange={(value) => setVariant(index, "status", value)}
                    disabled={submitting}
                  />
                </div>
                {!variant.variant_id && (
                  <div className="col-12">
                    {/* // Chỉ bỏ dòng mới chưa lưu; biến thể cũ dùng trạng thái Inactive. */}
                    <button
                      type="button"
                      className="form-btn btn btn-outline-dark mb-0"
                      onClick={() =>
                        setVariants((prev) => prev.filter((_, i) => i !== index))
                      }
                      disabled={submitting}
                    >
                      Xóa dòng
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* PRICING AND STOCK */}
          <div className="border rounded-4 bg-white p-4 mb-4">
            <div className="fw-bold mb-3">Giá và tồn kho</div>

            <div className="row g-3">
              {/* Giá sản phẩm */}
              <div className="col-12 col-md-6">
                <label className="form-label">Giá sản phẩm</label>
                <input
                  className="form-control"
                  placeholder="Ví dụ: 450000"
                  value={form.basePrice}
                  onChange={(e) => set("basePrice", e.target.value)}
                />
              </div>

              {/* Stock */}
              <div className="col-12 col-md-6">
                <label className="form-label">Tổng tồn kho</label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  placeholder="Ví dụ: 77"
                  value={totalStock}
                  readOnly
                />
              </div>

              {/* Discount */}
              <div className="col-12 col-md-6">
                <label className="form-label">Giá khuyến mãi</label>
                <input
                  className="form-control"
                  placeholder="Ví dụ: 400000"
                  value={form.discount}
                  onChange={(e) => set("discount", e.target.value)}
                />
              </div>

              {/* Loại giảm giá */}
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="discount-type">Loại giảm giá</label>
                <ProductDropdown
                  id="discount-type"
                  value={form.discountType}
                  options={DISCOUNT_TYPES.map((type) => ({ value: type, label: type }))}
                  placeholder="Chọn loại giảm giá"
                  onChange={(value) => set("discountType", value)}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ════════ RIGHT COL ════════ */}
        <div className="col-12 col-xl-5">
          {/* UPLOAD IMAGE */}
          <div className="border rounded-4 bg-white p-4 mb-4">
            <div className="fw-bold mb-3">Hình ảnh sản phẩm</div>

            {/* // Xem trước và tải lên, xóa từng ảnh bằng nút riêng. */}
            {mainImg ? (
              <img src={mainImg} alt="Ảnh chính sản phẩm" className="img-fluid w-100 rounded-3" />
            ) : (
              <div className="text-center text-secondary border rounded-3 p-5">
                <i className="bi bi-cloud-arrow-up fs-2 d-block mb-2" />
                Chưa có ảnh sản phẩm
              </div>
            )}
            <div className="d-flex gap-2 flex-wrap mt-3">
              <button
                type="button"
                className="form-btn btn btn-dark mb-0"
                onClick={() => mainImgRef.current.click()}
                disabled={submitting || readingImages}
              >
                <i className="bi bi-upload me-2" />
                {mainImg ? "Thay ảnh chính" : "Tải ảnh chính lên"}
              </button>
              {mainImg && (
                <button
                  type="button"
                  className="form-btn btn btn-outline-dark btn-export mb-0"
                  onClick={removeMainImg}
                  disabled={submitting || readingImages}
                >
                  <i className="bi bi-trash me-2" /> Xóa ảnh chính
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
            <div className="row g-3 mt-2">
              {thumbs.map((src, i) => (
                <div key={i} className="col-6 col-md-4">
                  <img
                    src={src}
                    alt={`Ảnh phụ ${i + 1}`}
                    className="img-fluid w-100 rounded-3"
                  />
                  <button
                    type="button"
                    className="form-btn btn btn-outline-dark btn-export w-100 mt-2 mb-0"
                    onClick={() => removeThumb(i)}
                    disabled={submitting || readingImages}
                    aria-label={`Xóa ảnh phụ ${i + 1}`}
                  >
                    <i className="bi bi-trash me-2" /> Xóa ảnh
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="form-btn btn btn-outline-dark btn-export mt-3 mb-0"
              onClick={() => moreImgRef.current.click()}
              disabled={submitting || readingImages || thumbs.length + (mainImg ? 1 : 0) >= 10}
            >
              <i className="bi bi-images me-2" /> Tải thêm ảnh lên
            </button>
            <p className="small text-muted mt-2 mb-0">
              {readingImages ? "Đang đọc ảnh..." : "Tối đa 10 ảnh, mỗi ảnh không quá 5 MB. Thay đổi ảnh được lưu khi bấm Lưu thay đổi."}
            </p>
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

          {/* CATEGORY */}
          <div className="border rounded-4 bg-white p-4 mb-4">
            <div className="fw-bold mb-3">Danh mục</div>

            <label className="form-label" htmlFor="product-category">Danh mục sản phẩm</label>

            {/* Select */}
            <ProductDropdown
              id="product-category"
              value={category}
              options={categories.map((c) => ({ value: c.category_id, label: c.name }))}
              placeholder="Chọn danh mục"
              onChange={setCategory}
              disabled={submitting}
            />
          </div>
        </div>
      </div>
    </>
  );
}

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
import Loading from "../../../../components/common/Loading";

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const ALL_GENDERS = ["Men", "Woman", "Unisex"];

const DISCOUNT_TYPES = [
  "No Discount",
  "Seasonal Sale",
  "Flash Sale",
  "Chinese New Year Discount",
  "Year-end Clearance",
  "Member Discount",
];

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
  const [categories, setCategories] = useState([]);

  /* ── form state ── */
  const [form, setForm] = useState({
    name: "",
    description: "",
    sizes: ["S"],
    genders: ["Woman"],
    basePrice: "",
    stock: "",
    discount: "",
    discountType: "No Discount",
  });

  /* ── image state ── */
  const [mainImg, setMainImg] = useState("");
  const [thumbs, setThumbs] = useState([]); // Chứa cả URL chuỗi hoặc File mới
  const [originalImageUrls, setOriginalImageUrls] = useState([]);

  /* ── category ── */
  const [category, setCategory] = useState("");
  const [customCat, setCustomCat] = useState("");
  const [showCatInput, setShowCatInput] = useState(false);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const toggleArr = (key, val) =>
    setForm((p) => ({
      ...p,
      [key]: p[key].includes(val)
        ? p[key].filter((x) => x !== val)
        : [...p[key], val],
    }));

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

        setForm({
          name: p.product_name || "",
          description: p.description || "",
          sizes: p.variants?.map((v) => v.size) || ["S"],
          genders: ["Woman"],
          basePrice: p.price || "",
          stock:
            p.variants?.reduce((acc, v) => acc + (v.stock_quantity || 0), 0) ||
            "",
          discount: p.discount_price ? String(p.discount_price) : "",
          discountType: "No Discount",
        });

        const imgs = p.image_urls || [];
        setOriginalImageUrls(imgs);
        if (imgs.length > 0) {
          setMainImg(imgs[0]);
          setThumbs(imgs.slice(1));
        }

        if (p.category_id) {
          setCategory(p.category_id);
        } else if (cats.length > 0) {
          setCategory(cats[0].category_id);
        }
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

  const handleMainImg = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMainImg(ev.target.result);
      setThumbs((prev) => [mainImg, ...prev].filter(Boolean));
    };
    reader.readAsDataURL(file);
  };

  const handleMoreImgs = (e) => {
    const files = Array.from(e.target.files).slice(0, 4 - thumbs.length);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        setThumbs((prev) => [...prev, ev.target.result].slice(0, 4));
      reader.readAsDataURL(file);
    });
  };

  const addCategory = () => {
    const val = customCat.trim();
    if (!val) return;
    setCategory(val);
    setShowCatInput(false);
    setCustomCat("");
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên sản phẩm");
      return;
    }
    if (!form.basePrice) {
      toast.error("Vui lòng nhập giá sản phẩm");
      return;
    }
    if (!form.stock) {
      toast.error("Vui lòng nhập số lượng tồn kho");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("product_name", form.name);
      formData.append("description", form.description);
      formData.append("price", form.basePrice);
      formData.append("original_price", form.basePrice);
      formData.append("discount_price", form.discount || 0);
      formData.append("category_id", category);
      formData.append("brand_id", "BR-DEFAULT"); // Hoặc lấy từ state nếu có

      const variantsPayload = form.sizes.map((sz) => ({
        size: sz,
        color: "Mặc định",
        stock_quantity: Math.floor(Number(form.stock) / form.sizes.length) || 0,
        status: "active",
      }));
      formData.append("variants", JSON.stringify(variantsPayload));

      const allImagesToKeep = [mainImg, ...thumbs].filter(
        (img) => typeof img === "string" && img.startsWith("http"),
      );
      formData.append("old_image_urls", JSON.stringify(allImagesToKeep));

      const newFiles = [mainImg, ...thumbs].filter(
        (img) => typeof img === "string" && img.startsWith("data:"),
      );

      for (const dataUrl of newFiles) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        formData.append("images", blob, `product_${Date.now()}.jpg`);
      }

      await updateAdminProduct(productId, formData);
      toast.success("Cập nhật sản phẩm thành công!");
      navigate("/admin/san-pham");
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Không thể cập nhật sản phẩm!",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <style>{`
        .cp-card { background: #fff; border-radius: 16px; border: 1px solid #F0EFF5; padding: 28px 28px 24px; margin-bottom: 20px; }
        .cp-card-title { font-size: 15px; font-weight: 800; color: #17151F; margin-bottom: 20px; letter-spacing: 0.1px; }
        .cp-label { font-size: 13.5px; font-weight: 700; color: #17151F; margin-bottom: 7px; display: block; }
        .cp-sublabel { font-size: 12px; font-weight: 600; color: #9CA0AC; margin-bottom: 10px; display: block; margin-top: -4px; }
        .cp-input, .cp-textarea, .cp-select { width: 100%; border-radius: 10px; border: 1.5px solid #ECEBF2; background: #F8F7FC; color: #17151F; font-size: 14px; font-family: 'Manrope', sans-serif; outline: none; transition: border-color 0.15s; }
        .cp-input { height: 44px; padding: 0 14px; }
        .cp-textarea { padding: 12px 14px; resize: none; height: 130px; line-height: 1.6; }
        .cp-select { height: 44px; padding: 0 36px 0 14px; appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%239CA0AC' d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
        .cp-input:focus, .cp-textarea:focus, .cp-select:focus { border-color: #22C55E; background: #fff; }
        .cp-pill-wrap { display: flex; gap: 8px; flex-wrap: wrap; }
        .cp-pill { min-width: 44px; height: 38px; border-radius: 10px; border: 1.5px solid #ECEBF2; background: #fff; font-size: 13.5px; font-weight: 700; color: #9CA0AC; cursor: pointer; padding: 0 14px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .cp-pill.active { background: #22C55E; border-color: #22C55E; color: #fff; }
        .cp-pill:hover:not(.active) { border-color: #22C55E; color: #22C55E; }
        .cp-gender-wrap { display: flex; gap: 20px; flex-wrap: wrap; }
        .cp-gender-label { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 700; color: #17151F; cursor: pointer; }
        .cp-radio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #ECEBF2; cursor: pointer; flex-shrink: 0; appearance: none; background: #fff; transition: all 0.15s; position: relative; }
        .cp-radio:checked { border-color: #22C55E; background: #22C55E; }
        .cp-radio:checked::after { content: ""; position: absolute; inset: 3px; border-radius: 50%; background: #fff; }
        .cp-main-img-box { width: 100%; aspect-ratio: 4/3; border-radius: 14px; border: 2px dashed #ECEBF2; background: #F8F7FC; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; position: relative; transition: border-color 0.15s; }
        .cp-main-img-box:hover { border-color: #22C55E; }
        .cp-main-img-box img { width: 100%; height: 100%; object-fit: cover; }
        .cp-main-img-placeholder { text-align: center; color: #B4B2C0; }
        .cp-main-img-placeholder i { font-size: 32px; display: block; margin-bottom: 8px; }
        .cp-main-img-placeholder span { font-size: 13px; font-weight: 600; }
        .cp-thumb-strip { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
        .cp-thumb { width: 72px; height: 72px; border-radius: 12px; object-fit: cover; border: 2px solid #ECEBF2; cursor: pointer; }
        .cp-thumb.active { border-color: #22C55E; }
        .cp-thumb-add { width: 72px; height: 72px; border-radius: 12px; border: 2px dashed #ECEBF2; background: #F8F7FC; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 22px; color: #B4B2C0; transition: border-color 0.15s, color 0.15s; }
        .cp-thumb-add:hover { border-color: #22C55E; color: #22C55E; }
        .cp-cat-select-wrap { position: relative; }
        .cp-cat-select-wrap .cp-select { padding-right: 36px; }
        .cp-cat-dropdown-icon { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 22px; height: 22px; border-radius: 50%; background: #17151F; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; pointer-events: none; }
        .cp-add-cat-btn { width: 100%; height: 44px; border-radius: 10px; background: #22C55E; border: none; color: #fff; font-size: 14px; font-weight: 800; font-family: 'Manrope', sans-serif; cursor: pointer; transition: opacity 0.15s; display: flex; align-items: center; justify-content: center; gap: 7px; }
        .cp-add-cat-btn:hover { opacity: 0.88; }
        .cp-page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
        .cp-page-title { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 800; color: #17151F; }
        .cp-page-title i { font-size: 20px; }
        .cp-head-actions { display: flex; gap: 10px; }
        .cp-btn-ghost { display: flex; align-items: center; gap: 7px; background: #fff; border: 1.5px solid #ECEBF2; color: #17151F; font-size: 13.5px; font-weight: 700; padding: 10px 18px; border-radius: 10px; cursor: pointer; transition: all 0.15s; }
        .cp-btn-ghost:hover { border-color: #C9C3F8; background: #F8F7FC; }
        .cp-btn-green { display: flex; align-items: center; gap: 7px; background: #22C55E; border: none; color: #fff; font-size: 13.5px; font-weight: 800; padding: 10px 20px; border-radius: 10px; cursor: pointer; transition: opacity 0.15s; }
        .cp-btn-green:hover { opacity: 0.88; }
        .cp-file-hidden { display: none; }
      `}</style>

      <Helmet>
        <title>Chỉnh sửa sản phẩm | Selene</title>
      </Helmet>

      {/* ── PAGE HEADER ── */}
      <div className="cp-page-head">
        <div className="cp-page-title">
          <i className="bi bi-pencil-square" />
          Edit Product
        </div>
        <div className="cp-head-actions">
          <button className="cp-btn-ghost" onClick={() => navigate(returnUrl)}>
            <i className="bi bi-arrow-left" /> Back
          </button>
          <button
            className="cp-btn-green"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <span className="spinner-border spinner-border-sm me-1" />
            ) : (
              <i className="bi bi-check-lg" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* ── 2-COLUMN LAYOUT ── */}
      <div className="row g-4 align-items-start">
        {/* ════════ LEFT COL ════════ */}
        <div className="col-12 col-xl-7">
          {/* GENERAL INFORMATION */}
          <div className="cp-card">
            <div className="cp-card-title">General Information</div>

            {/* Name */}
            <div className="mb-3">
              <label className="cp-label">Name Product</label>
              <input
                className="cp-input"
                placeholder="e.g. Puffer Jacket With Pocket Detail"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={120}
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="cp-label">Description Product</label>
              <textarea
                className="cp-textarea"
                placeholder="Describe your product in detail..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            {/* Size + Gender side by side */}
            <div className="row g-4">
              {/* Size */}
              <div className="col-12 col-md-6">
                <label className="cp-label">Size</label>
                <span className="cp-sublabel">Pick Available Size</span>
                <div className="cp-pill-wrap">
                  {ALL_SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`cp-pill${
                        form.sizes.includes(s) ? " active" : ""
                      }`}
                      onClick={() => toggleArr("sizes", s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div className="col-12 col-md-6">
                <label className="cp-label">Gender</label>
                <span className="cp-sublabel">Pick Available Gender</span>
                <div className="cp-gender-wrap">
                  {ALL_GENDERS.map((g) => (
                    <label key={g} className="cp-gender-label">
                      <input
                        type="radio"
                        className="cp-radio"
                        name="gender"
                        checked={form.genders.includes(g)}
                        onChange={() => set("genders", [g])}
                      />
                      {g}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PRICING AND STOCK */}
          <div className="cp-card">
            <div className="cp-card-title">Pricing And Stock</div>

            <div className="row g-3">
              {/* Base Pricing */}
              <div className="col-12 col-md-6">
                <label className="cp-label">Base Pricing</label>
                <input
                  className="cp-input"
                  placeholder="e.g. 450000"
                  value={form.basePrice}
                  onChange={(e) => set("basePrice", e.target.value)}
                />
              </div>

              {/* Stock */}
              <div className="col-12 col-md-6">
                <label className="cp-label">Stock</label>
                <input
                  className="cp-input"
                  type="number"
                  min={0}
                  placeholder="e.g. 77"
                  value={form.stock}
                  onChange={(e) => set("stock", e.target.value)}
                />
              </div>

              {/* Discount */}
              <div className="col-12 col-md-6">
                <label className="cp-label">Discount Price</label>
                <input
                  className="cp-input"
                  placeholder="e.g. 400000"
                  value={form.discount}
                  onChange={(e) => set("discount", e.target.value)}
                />
              </div>

              {/* Discount Type */}
              <div className="col-12 col-md-6">
                <label className="cp-label">Discount Type</label>
                <div className="cp-cat-select-wrap">
                  <select
                    className="cp-select"
                    value={form.discountType}
                    onChange={(e) => set("discountType", e.target.value)}
                  >
                    {DISCOUNT_TYPES.map((dt) => (
                      <option key={dt} value={dt}>
                        {dt}
                      </option>
                    ))}
                  </select>
                  <div className="cp-cat-dropdown-icon">
                    <i
                      className="bi bi-chevron-down"
                      style={{ fontSize: 10 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════ RIGHT COL ════════ */}
        <div className="col-12 col-xl-5">
          {/* UPLOAD IMAGE */}
          <div className="cp-card">
            <div className="cp-card-title">Upload Img</div>

            {/* Main image */}
            <div
              className="cp-main-img-box"
              onClick={() => mainImgRef.current.click()}
            >
              {mainImg ? (
                <img src={mainImg} alt="main" />
              ) : (
                <div className="cp-main-img-placeholder">
                  <i className="bi bi-cloud-arrow-up" />
                  <span>Click to upload main image</span>
                </div>
              )}
            </div>
            <input
              ref={mainImgRef}
              type="file"
              accept="image/*"
              className="cp-file-hidden"
              onChange={handleMainImg}
            />

            {/* Thumb strip */}
            <div className="cp-thumb-strip">
              {thumbs.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`thumb-${i}`}
                  className="cp-thumb"
                />
              ))}

              {/* Add more button */}
              {thumbs.length < 4 && (
                <div
                  className="cp-thumb-add"
                  onClick={() => moreImgRef.current.click()}
                  title="Thêm ảnh"
                >
                  <i className="bi bi-plus-circle" />
                </div>
              )}
            </div>
            <input
              ref={moreImgRef}
              type="file"
              accept="image/*"
              multiple
              className="cp-file-hidden"
              onChange={handleMoreImgs}
            />
          </div>

          {/* CATEGORY */}
          <div className="cp-card">
            <div className="cp-card-title">Category</div>

            <label className="cp-label">Product Category</label>

            {/* Select */}
            <div className="cp-cat-select-wrap mb-3">
              <select
                className="cp-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="cp-cat-dropdown-icon">
                <i className="bi bi-chevron-down" style={{ fontSize: 10 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

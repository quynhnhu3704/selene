import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";
import Loading from "../../../../components/common/Loading";
import {
  createAdminCategory,
  getAdminCategoryDetail,
  updateAdminCategory,
} from "../../../../services/category.service";

export default function CategoryPage({ create = false }) {
  const { categoryId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const base = "/admin/danh-muc";
  const requestedReturn = params.get("returnUrl");
  const back =
    requestedReturn === base || requestedReturn?.startsWith(base + "?")
      ? requestedReturn
      : base;
  const title = create ? "Thêm danh mục" : "Chỉnh sửa danh mục";
  const [form, setForm] = useState({
    name: "",
    description: "",
    image_url: "",
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(!create);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (create) return;
    let isCurrentRequest = true;
    setLoading(true);
    setError("");
    getAdminCategoryDetail(categoryId)
      .then((res) => {
        if (isCurrentRequest) setForm(res.data);
      })
      .catch((err) => {
        if (isCurrentRequest)
          setError(err.response?.data?.message || "Không thể tải danh mục!");
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });
    return () => {
      isCurrentRequest = false;
    };
  }, [create, categoryId]);

  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (
      file &&
      (file.size > 5 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.type,
        ))
    ) {
      toast.error("Chọn ảnh JPG, PNG, WEBP hoặc GIF tối đa 5 MB.");
      event.target.value = "";
      setImage(null);
      return;
    }
    setImage(file || null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên danh mục!");
      return;
    }
    try {
      setSaving(true);
      const data = new FormData();
      data.append("name", form.name.trim());
      data.append("description", (form.description || "").trim());
      if (image) data.append("image", image);
      const res = create
        ? await createAdminCategory(data)
        : await updateAdminCategory(categoryId, data);
      toast.success(res.message);
      navigate(back);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể lưu danh mục!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{title} | Selene</title>
      </Helmet>
      <div className="adm-page-head">
        <div className="adm-page-title">{title}</div>
        <Link className="form-btn btn btn-outline-dark" to={back}>
          <i className="bi bi-arrow-left me-2" />
          Quay lại
        </Link>
      </div>
      {loading ? (
        <Loading text="Đang tải danh mục..." />
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3 p-4 border">
          <fieldset disabled={saving}>
            <div className="row g-4">
              <div className="col-md-4">
                <label htmlFor="category-image" className="form-label">
                  Ảnh danh mục (tối đa 5 MB)
                </label>
                {(preview || form.image_url) && (
                  <img
                    src={preview || form.image_url}
                    alt="Ảnh danh mục"
                    className="d-block rounded mb-3"
                    style={{
                      width: "100%",
                      maxWidth: 280,
                      aspectRatio: "1",
                      objectFit: "cover",
                    }}
                  />
                )}
                <input
                  id="category-image"
                  type="file"
                  className="form-control"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                />
                <div className="form-text">
                  Mỗi danh mục sử dụng một ảnh. Chọn ảnh mới để thay thế ảnh
                  hiện tại.
                </div>
              </div>
              <div className="col-md-8">
                <div className="mb-4">
                  <label htmlFor="category-name" className="form-label">
                    Tên danh mục <span className="text-danger">*</span>
                  </label>
                  <input
                    id="category-name"
                    className="form-control"
                    required
                    maxLength={80}
                    placeholder="Nhập tên danh mục"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <label htmlFor="category-description" className="form-label">
                  Mô tả
                </label>
                <textarea
                  id="category-description"
                  className="form-control"
                  rows={5}
                  placeholder="Nhập mô tả danh mục"
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-3 mt-4">
              <Link
                to={back}
                className="form-btn btn btn-outline-dark fw-semibold px-4"
              >
                Hủy
              </Link>
              <button
                type="submit"
                className="form-btn btn btn-dark fw-semibold px-4"
                disabled={saving}
              >
                {saving
                  ? "Đang lưu..."
                  : create
                    ? "Thêm danh mục"
                    : "Lưu thay đổi"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </>
  );
}

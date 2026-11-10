import AdminSaveButton from "../../components/AdminSaveButton";
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

  // Prepare request state before committing a changed route/filter.
  const requestKey = JSON.stringify([create, categoryId]);
  const [previousRequestKey, setPreviousRequestKey] = useState(requestKey);
  if (previousRequestKey !== requestKey) {
    setPreviousRequestKey(requestKey);
    setLoading(!create);
    setError("");
  }

  useEffect(() => {
    if (create) return;
    let isCurrentRequest = true;
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
    if (preview) return () => URL.revokeObjectURL(preview);
  }, [preview]);

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
      setPreview("");
      return;
    }
    setImage(file || null);
    setPreview(file ? URL.createObjectURL(file) : "");
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
        <div className="d-flex flex-wrap gap-2">
          <Link className="form-btn btn btn-outline-dark" to={back}>
            <i className="bi bi-arrow-left me-2" />
            Quay lại
          </Link>
          <AdminSaveButton type="submit" form="category-form" disabled={loading || Boolean(error)} saving={saving}>
            {create ? "Thêm danh mục" : "Lưu thay đổi"}
          </AdminSaveButton>
        </div>
      </div>
      {loading ? (
        <div
          className="d-flex align-items-center justify-content-center"
          style={{ minHeight: "60vh" }}
        >
          <Loading text="Đang tải danh mục..." />
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <form id="category-form" onSubmit={handleSubmit}>
          <fieldset disabled={saving}>
            <div className="row g-4">
              <div className="col-md-4">
                <section className="edit-section">
                  <h2 className="edit-section-title"><i className="bi bi-image" />Ảnh danh mục</h2>
                  <label htmlFor="category-image" className="form-label">
                    Ảnh danh mục (tối đa 5 MB)
                  </label>
                  {(preview || form.image_url) ? (
                    <img
                      src={preview || form.image_url}
                      alt="Ảnh danh mục"
                      className="edit-main-img mb-3"
                    />
                  ) : (
                    <div className="edit-img-placeholder mb-3">
                      <i className="bi bi-image fs-1" />
                      <span>Chưa có ảnh danh mục</span>
                    </div>
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
                </section>
              </div>
              <div className="col-md-8">
                <section className="edit-section">
                  <h2 className="edit-section-title"><i className="bi bi-info-circle" />Thông tin danh mục</h2>
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
                </section>
              </div>
            </div>
          </fieldset>
        </form>
      )}
    </>
  );
}

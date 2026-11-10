// frontend/src/pages/Admin/components/ProfileForm.jsx
import { useEffect, useState } from "react";
import AdminSelect from "./AdminSelect";
import { toast } from "react-toastify";

export default function ProfileForm({
  profile,
  setProfile,
  setAvatar,
  avatar,
  saving,
  readOnly,
  create,
  role,
  handleSubmit,
}) {
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!avatar) return;
    const reader = new FileReader();
    reader.onload = () => setPreview({ file: avatar, url: reader.result });
    reader.readAsDataURL(avatar);
    return () => {
      reader.onload = null;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [avatar]);
  const avatarUrl =
    (avatar && preview?.file === avatar ? preview.url : null) ||
    profile.avatar_url;
  const fields = [
    ["full_name", "Họ và tên", "text", true],
    ["email", "Email", "email", true],
    ["phone", "Số điện thoại", "tel", true],
    ["dob", "Ngày sinh", "date"],
    ["address", "Địa chỉ", "text"],
    ["identity_card", "CCCD", "text"],
  ];
  return (
    <form id="admin-profile-form" onSubmit={handleSubmit}>
      <fieldset disabled={saving}>
        <div className="row g-4">
          <div className="col-lg-8">
            <section className="edit-section">
              <h2 className="edit-section-title">Thông tin cá nhân</h2>
              <div className="row g-4">
                {fields.map(([key, label, type, required]) => (
                  <div className="col-md-6" key={key}>
                    <label htmlFor={key} className="form-label fw-semibold">
                      {label}
                      {required && !readOnly ? " *" : ""}
                    </label>
                    {readOnly ? (
                      <div>{profile[key] || "—"}</div>
                    ) : (
                      <input
                        id={key}
                        className="form-control"
                        type={type}
                        required={required}
                        value={profile[key] || ""}
                        max={
                          type === "date"
                            ? new Date().toISOString().slice(0, 10)
                            : undefined
                        }
                        pattern={
                          key === "phone"
                            ? "0[0-9]{9}"
                            : key === "identity_card"
                              ? "[0-9]{12}"
                              : undefined
                        }
                        onChange={(e) =>
                          setProfile({ ...profile, [key]: e.target.value })
                        }
                      />
                    )}
                  </div>
                ))}
                <div className="col-md-6">
                  <label htmlFor="gender" className="form-label fw-semibold">
                    Giới tính
                  </label>
                  {readOnly ? (
                    <div>
                      {{ male: "Nam", female: "Nữ", other: "Khác" }[
                        profile.gender
                      ] ||
                        profile.gender ||
                        "—"}
                    </div>
                  ) : (
                    <AdminSelect
                      id="gender"
                      value={profile.gender || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, gender: e.target.value })
                      }
                    >
                      <option value="">Chưa cập nhật</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </AdminSelect>
                  )}
                </div>
              </div>
              {create && (
                <p className="text-muted mt-4">
                  Mật khẩu ban đầu là số điện thoại của{" "}
                  {role === "staff" ? "nhân viên" : "khách hàng"}.
                </p>
              )}
            </section>
          </div>
          <div className="col-lg-4">
            <section className="edit-section">
              <h2 className="edit-section-title">Ảnh đại diện</h2>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Ảnh đại diện"
                  className="edit-main-img mb-3"
                />
              ) : (
                <div className="edit-img-placeholder mb-3">
                  <i className="bi bi-person fs-1" aria-hidden="true" />
                  <span>Chưa có ảnh đại diện</span>
                </div>
              )}
              {!readOnly && (
                <>
                  <label htmlFor="avatar" className="form-label">
                    Ảnh đại diện (tối đa 5 MB)
                  </label>
                  <input
                    id="avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="form-control"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (
                        file &&
                        (file.size > 5 * 1024 * 1024 ||
                          !["image/jpeg", "image/png", "image/webp"].includes(
                            file.type,
                          ))
                      ) {
                        toast.error("Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.");
                        e.target.value = "";
                        setAvatar(null);
                      } else setAvatar(file);
                    }}
                  />
                </>
              )}
            </section>
          </div>
        </div>
      </fieldset>
    </form>
  );
}

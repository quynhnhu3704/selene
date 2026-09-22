// frontend/src/pages/Admin/components/ProfileForm.jsx
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

export default function ProfileForm({
  profile,
  setProfile,
  setAvatar,
  saving,
  readOnly,
  create,
  role,
  back,
  handleSubmit,
}) {
  const fields = [
    ["full_name", "Họ và tên", "text", true],
    ["email", "Email", "email", true],
    ["phone", "Số điện thoại", "tel", true],
    ["dob", "Ngày sinh", "date"],
    ["address", "Địa chỉ", "text"],
    ["identity_card", "CCCD", "text"],
  ];
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3 p-4 border">
      <fieldset disabled={saving}>
        <div className="row g-4">
          <div className="col-12">
            {profile.avatar_url && (
              <img
                src={profile.avatar_url}
                alt=""
                className="adm-thumb mb-3"
              />
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
          </div>
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
              <select
                id="gender"
                className="form-select"
                value={profile.gender || ""}
                onChange={(e) =>
                  setProfile({ ...profile, gender: e.target.value })
                }
              >
                <option value="">Chưa cập nhật</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            )}
          </div>
        </div>
        {create && (
          <p className="text-muted mt-4">
            Mật khẩu ban đầu là số điện thoại của{" "}
            {role === "staff" ? "nhân viên" : "khách hàng"}.
          </p>
        )}
        {!readOnly && (
          <div className="d-flex justify-content-end gap-3 mt-4">
            <Link to={back} className="form-btn btn btn-outline-dark">
              Hủy
            </Link>
            <button className="form-btn btn btn-dark" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thông tin"}
            </button>
          </div>
        )}
      </fieldset>
    </form>
  );
}

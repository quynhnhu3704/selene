// frontend\src\pages\Account\Profile\components\InfoPanel.jsx
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { saveUser } from "../../../../utils/auth";
import { updateProfile } from "../../../../services/user.service";
import defaultAvatar from "../../../../assets/images/default-avatar.png";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function InfoPanel({ profile, setProfile }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    gender: "",
    dob: "",
  });
  const [errors, setErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(defaultAvatar);
  const [genderOpen, setGenderOpen] = useState(false);
  const genderRef = useRef(null);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^0\d{9}$/;
  const getRoleName = (roleId) => {
    switch (Number(roleId)) {
      case 1:
        return "Chủ cửa hàng";
      case 2:
        return "Nhân viên";
      case 3:
        return "Khách hàng";
      default:
        return "Không xác định";
    }
  };
  const today = new Date();

  const minDate = new Date(
    today.getFullYear() - 100,
    today.getMonth(),
    today.getDate(),
  );

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "phone_number") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleGenderSelect = (gender) => {
    setForm((prev) => ({
      ...prev,
      gender,
    }));

    setGenderOpen(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    if (!profile) return;

    setForm({
      full_name: profile.full_name || "",
      email: profile.email || "",
      phone_number: profile.phone_number || "",
      gender: profile.gender || "",
      dob: profile.dob || "",
    });
    setAvatarPreview(profile?.avatar_url || defaultAvatar);
    setAvatarFile(null);
  };

  const normalizeFullName = (fullName) => {
    return fullName
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const validate = () => {
    const trimmedName = form.full_name.trim();
    const trimmedPhone = form.phone_number.trim();
    const newErrors = {};

    // Họ tên
    if (!trimmedName) {
      newErrors.full_name = "Vui lòng nhập họ tên";
    } else if (trimmedName.length < 2) {
      newErrors.full_name = "Họ tên phải từ 2 ký tự trở lên";
    } else if (trimmedName.length > 100) {
      newErrors.full_name = "Họ tên không được vượt quá 100 ký tự";
    } else if (!/[a-zA-ZÀ-ỹ]/.test(trimmedName)) {
      newErrors.full_name = "Họ tên không hợp lệ";
    }

    // SĐT
    if (!trimmedPhone) {
      newErrors.phone_number = "Vui lòng nhập số điện thoại";
    } else if (!phoneRegex.test(trimmedPhone)) {
      newErrors.phone_number = "Số điện thoại không hợp lệ";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const data = new FormData();
      data.append("full_name", normalizeFullName(form.full_name));
      data.append("phone_number", form.phone_number.trim());
      data.append("gender", form.gender);
      data.append("dob", form.dob);
      if (avatarFile) {
        data.append("avatar_url", avatarFile);
      }
      const res = await updateProfile(data);
      setProfile({
        ...profile,
        ...res.data.profile,
        email: profile.email,
      });
      saveUser({
        ...profile,
        ...res.data.profile,
        email: profile.email,
      });
      toast.success(res.data.message);
      setErrors({});
      setEditing(false);
      setAvatarFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Cập nhật thất bại");
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const displayDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  };

  useEffect(() => {
    resetForm();
  }, [profile]);

  // Thêm
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (genderRef.current && !genderRef.current.contains(e.target)) {
        setGenderOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const Empty = () => (
    <span style={{ color: "#ced4da", fontStyle: "italic", fontSize: 14 }}>
      Chưa cập nhật
    </span>
  );

  return (
    <>
      <h5 className="page-panel-title">THÔNG TIN TÀI KHOẢN</h5>

      {/* ── HERO ── */}
      <div className="info-hero">
        <div className="info-avatar-wrap">
          <img
            src={avatarPreview}
            alt="Avatar"
            className="info-avatar"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = defaultAvatar;
            }}
          />
          {editing && (
            <>
              <input
                id="avatar-upload"
                hidden
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
              />
              <label
                htmlFor="avatar-upload"
                className="info-avatar-edit"
                title="Đổi ảnh"
              >
                <i className="bi bi-camera-fill" />
              </label>
            </>
          )}
        </div>
        <div>
          <p className="info-hero-name">{profile?.full_name || "—"}</p>
          <p className="info-hero-email">{profile?.email}</p>
          <span className="info-hero-role">
            <i className="bi bi-person-check" />
            {getRoleName(profile?.role_id)}
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} noValidate>
        <div className="info-grid">
          {/* Họ tên */}
          <div className="info-field">
            <span className="info-field-label">
              Họ tên{editing && <span className="text-danger ms-1">*</span>}
            </span>
            <div className="info-field-val">
              {editing ? (
                <>
                  <input
                    name="full_name"
                    placeholder="Nhập họ tên"
                    className={`form-control ${errors.full_name ? "is-invalid" : ""}`}
                    value={form.full_name}
                    onChange={handleChange}
                    maxLength={100}
                    autoComplete="name"
                    required
                    onBlur={() => {
                      if (form.full_name.trim()) {
                        setForm((prev) => ({
                          ...prev,
                          full_name: normalizeFullName(prev.full_name),
                        }));
                      }
                    }}
                  />
                  {errors.full_name && (
                    <div className="invalid-feedback d-block">
                      {errors.full_name}
                    </div>
                  )}
                </>
              ) : (
                <span>{form.full_name || <Empty />}</span>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="info-field">
            <span className="info-field-label">Email</span>
            <div className="info-field-val">
              {editing ? (
                <>
                  <input
                    placeholder="Địa chỉ email"
                    className={`form-control ${errors.email ? "is-invalid" : ""}`}
                    value={form.email}
                    disabled
                  />
                  {errors.email && (
                    <div className="invalid-feedback d-block">
                      {errors.email}
                    </div>
                  )}
                </>
              ) : (
                <span>{form.email || <Empty />}</span>
              )}
            </div>
          </div>

          {/* Số điện thoại */}
          <div className="info-field">
            <span className="info-field-label">
              Số điện thoại
              {editing && <span className="text-danger ms-1">*</span>}
            </span>
            <div className="info-field-val">
              {editing ? (
                <>
                  <input
                    name="phone_number"
                    placeholder="Nhập số điện thoại"
                    className={`form-control ${errors.phone_number ? "is-invalid" : ""}`}
                    value={form.phone_number}
                    onChange={handleChange}
                    maxLength={10}
                    autoComplete="tel"
                    required
                  />
                  {errors.phone_number && (
                    <div className="invalid-feedback d-block">
                      {errors.phone_number}
                    </div>
                  )}
                </>
              ) : (
                <span>{form.phone_number || <Empty />}</span>
              )}
            </div>
          </div>

          {/* Giới tính */}
          <div className="info-field">
            <span className="info-field-label">Giới tính</span>
            <div className="info-field-val">
              {editing ? (
                <div className="dropdown w-100" ref={genderRef}>
                  <button
                    type="button"
                    className="form-control text-start d-flex justify-content-between align-items-center"
                    onClick={() => setGenderOpen((prev) => !prev)}
                  >
                    <span>{form.gender || "-- Chọn --"}</span>
                    <i
                      className={`bi ${genderOpen ? "bi-caret-up" : "bi-caret-down"}`}
                    />
                  </button>

                  {genderOpen && (
                    <ul className="dropdown-menu show w-100 mt-1 shadow-sm">
                      <li>
                        <button
                          type="button"
                          className="dropdown-item fw-normal"
                          onClick={() => handleGenderSelect("")}
                        >
                          -- Chọn --
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="dropdown-item fw-normal"
                          onClick={() => handleGenderSelect("Nam")}
                        >
                          Nam
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="dropdown-item fw-normal"
                          onClick={() => handleGenderSelect("Nữ")}
                        >
                          Nữ
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          className="dropdown-item fw-normal"
                          onClick={() => handleGenderSelect("Khác")}
                        >
                          Khác
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              ) : (
                <span>{form.gender || <Empty />}</span>
              )}
            </div>
          </div>

          {/* Ngày sinh */}
          <div className="info-field">
            <span className="info-field-label">Ngày sinh</span>
            <div className="info-field-val">
              {editing ? (
                <DatePicker
                  selected={parseDate(form.dob)}
                  onChange={(date) =>
                    setForm((prev) => ({
                      ...prev,
                      dob: date ? formatDate(date) : "",
                    }))
                  }
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Chọn ngày sinh"
                  className="form-control"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  minDate={minDate}
                  maxDate={new Date()}
                  showPopperArrow={false}
                />
              ) : (
                <span>{form.dob ? displayDate(form.dob) : <Empty />}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div className="info-actions">
          {editing ? (
            <>
              <button
                type="submit"
                className="form-btn btn btn-dark fw-semibold px-4"
              >
                <i className="bi bi-check2 me-1" /> Lưu thay đổi
              </button>
              <button
                type="button"
                className="form-btn form-btn-cancel btn btn-outline-dark fw-semibold px-4"
                onClick={() => {
                  resetForm();
                  setErrors({});
                  setEditing(false);
                }}
              >
                Huỷ
              </button>
            </>
          ) : (
            <button
              type="button"
              className="form-btn btn btn-dark fw-semibold px-4"
              onClick={(e) => {
                e.preventDefault(); // Chặn hành vi submit mặc định nếu có
                e.stopPropagation(); // Chặn sự kiện nổi bọt lên thẻ div cha
                setEditing(true);
              }}
            >
              <i className="bi bi-pencil-square me-1" /> Chỉnh sửa thông tin
            </button>
          )}
        </div>
      </form>
    </>
  );
}

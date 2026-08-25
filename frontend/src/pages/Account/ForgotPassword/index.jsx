// frontend\src\pages\Account\ForgotPassword\index.jsx
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import Breadcrumb from "../../../components/layout/Breadcrumb";
import { forgotPassword } from "../../../services/auth.service";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [email, setEmail] = useState("");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const handleReset = () => {
    setEmail("");
    setErrors({});
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value.trimStart());
    setErrors((prev) => ({
      ...prev,
      email: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!emailRegex.test(trimmedEmail)) {
      newErrors.email = "Email không hợp lệ";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const res = await forgotPassword({
        email: email.trim(),
      });

      toast.success(res.data.message);
      handleReset();

      setTimeout(() => {
        navigate("/tai-khoan/dang-nhap");
      }, 1800);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Khôi phục mật khẩu thất bại!",
      );
    }
  };

  return (
    <>
      <Helmet>
        <title>Quên mật khẩu | Selene</title>
      </Helmet>

      <Breadcrumb
        items={[
          { label: "Trang chủ", path: "/" },
          { label: "Đăng nhập", path: "/tai-khoan/dang-nhap" },
          { label: "Quên mật khẩu" },
        ]}
      />

      <div className="login-page">
        <div className="login-card">
          <h1 className="form-title">Quên mật khẩu</h1>

          <form onSubmit={handleSubmit} noValidate>
            <div>
              <div className="form-label-row">
                <span className="form-label">
                  Email <span className="text-danger">*</span>
                </span>
              </div>

              <div className="form-input-wrap">
                <input
                  type="email"
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  placeholder="Nhập email đã đăng ký"
                  value={email}
                  onChange={handleEmailChange}
                  maxLength={100}
                  autoComplete="email"
                  required
                />
                {errors.email && (
                  <div className="invalid-feedback d-block">{errors.email}</div>
                )}
              </div>
            </div>

            <div className="row">
              <div className="col-6">
                <button
                  type="reset"
                  onClick={handleReset}
                  className="form-btn btn btn-outline-dark fw-semibold w-100"
                >
                  Đặt lại
                </button>
              </div>

              <div className="col-6">
                <button
                  type="submit"
                  className="form-btn btn btn-dark fw-semibold w-100"
                >
                  <i className="bi bi-send me-1"></i> Gửi
                </button>
              </div>
            </div>
          </form>

          <div className="form-register-row">
            <Link to="/tai-khoan/dang-nhap">
              <i className="bi bi-arrow-left me-1"></i> Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

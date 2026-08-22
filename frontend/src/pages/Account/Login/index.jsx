// frontend\src\pages\Login.jsx
import Breadcrumb from "../../../components/layout/Breadcrumb";
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveLogin } from "../../../utils/auth";
import { toast } from "react-toastify";
import { login } from "../../../services/auth.service";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const navigate = useNavigate();

  const handleReset = () => {
    setEmail("");
    setPassword("");
    setErrors({});
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value.trimStart());
    setErrors((prev) => ({
      ...prev,
      email: "",
    }));
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setErrors((prev) => ({
      ...prev,
      password: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    const trimmedEmail = email.trim();

    // Email
    if (!trimmedEmail) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!emailRegex.test(trimmedEmail)) {
      newErrors.email = "Email không hợp lệ";
    }

    // Password
    if (!password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const res = await login({
        email: email.trim(),
        password,
      });

      saveLogin(res.data);

      window.dispatchEvent(new Event("login-success"));

      toast.success(res.data.message);

      if (res.data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }

      handleReset();
    } catch (err) {
      toast.error(err.response?.data?.message || "Đăng nhập thất bại!");
    }
  };

  const handleGoogleLogin = () => {
    const params = new URLSearchParams({
      client_id:
        "368790655962-ac64i65olr3sb7k8mv5pbb18ak0ai2g4.apps.googleusercontent.com",
      redirect_uri: "http://localhost:8000/api/auth/google/callback",
      response_type: "code",
      scope: "openid email profile",
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  return (
    <>
      <Helmet>
        <title>Đăng nhập | Selene</title>
      </Helmet>

      <Breadcrumb
        items={[{ label: "Trang chủ", path: "/" }, { label: "Đăng nhập" }]}
      />

      {/* ── LOGIN PAGE ── */}
      <div className="login-page">
        <div className="login-card">
          <h1 className="form-title">Đăng nhập</h1>

          <form onSubmit={handleSubmit} noValidate>
            {/* EMAIL */}
            <div>
              <div className="form-label-row">
                <span className="form-label mb-0">
                  Email <span className="text-danger">*</span>
                </span>
              </div>
              <div className="form-input-wrap">
                <input
                  type="email"
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  placeholder="Nhập địa chỉ email"
                  value={email}
                  onChange={handleEmailChange}
                  autoComplete="email"
                  maxLength={100}
                  required
                />
                {errors.email && (
                  <div className="invalid-feedback d-block">{errors.email}</div>
                )}
              </div>
            </div>

            {/* MẬT KHẨU */}
            <div>
              <div className="form-label-row">
                <span className="form-label mb-0">
                  Mật khẩu <span className="text-danger">*</span>
                </span>
                <Link to="/tai-khoan/quen-mat-khau" className="form-link-sm">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="form-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`form-control has-eye ${errors.password ? "border-danger" : ""}`}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={handlePasswordChange}
                  autoComplete="current-password"
                  maxLength={50}
                  required
                />
                <button
                  type="button"
                  className="form-eye"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                  aria-label="Hiện/ẩn mật khẩu"
                >
                  <i
                    className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}
                  />
                </button>
                {errors.password && (
                  <div className="invalid-feedback d-block">
                    {errors.password}
                  </div>
                )}
              </div>
            </div>

            {/* NÚT ĐĂNG NHẬP */}
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
                  Đăng nhập
                </button>
              </div>
            </div>
          </form>

          {/* CHƯA CÓ TÀI KHOẢN */}
          <div className="form-register-row">
            Bạn chưa có tài khoản?&nbsp;
            <Link to="/tai-khoan/dang-ky">Đăng ký</Link>
          </div>

          {/* DIVIDER */}
          <div className="form-divider">hoặc</div>

          {/* NÚT GOOGLE */}
          <button
            type="button"
            className="btn btn-outline-dark form-btn-google"
            onClick={handleGoogleLogin}
          >
            {/* Google "G" logo SVG chính thức */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
            Tiếp tục với Google
          </button>
        </div>
      </div>
    </>
  );
}

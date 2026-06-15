// frontend\src\pages\Login.jsx
import Breadcrumb from "../../../components/layout/Breadcrumb";
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: gọi API đăng nhập
    console.log({ email, password });
  };

  const handleGoogleLogin = () => {
    // TODO: gọi Google OAuth
    console.log("Google login");
  };

  return (
    <>
      <Helmet><title>Đăng Nhập | Selene</title></Helmet>
  
      <Breadcrumb
        items={[
          { label: "Trang chủ", path: "/" },
          { label: "Đăng nhập" }
        ]}
      />

      {/* ── LOGIN PAGE ── */}
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">Đăng nhập</h1>

          <form onSubmit={handleSubmit} noValidate>

            {/* EMAIL */}
            <div>
              <div className="login-label-row">
                <span className="login-label">Email</span>
              </div>
              <div className="login-input-wrap">
                <input type="email" className="form-control" placeholder="Nhập email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
              </div>
            </div>

            {/* MẬT KHẨU */}
            <div>
              <div className="login-label-row">
                <span className="login-label">Mật khẩu</span>
                <Link to="/dat-lai-mat-khau" className="login-link-sm"> Đặt lại mật khẩu</Link>
              </div>
              <div className="login-input-wrap">
                <input type={showPassword ? "text" : "password"} className="form-control has-eye" placeholder="Nhập mật khẩu" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
                <button type="button" className="login-eye" onClick={() => setShowPassword(s => !s)} tabIndex={-1} aria-label="Hiện/ẩn mật khẩu">
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
              </div>
            </div>

            {/* NÚT ĐĂNG NHẬP */}
            <div className="row">
              <div className="col-6">
                <button type="reset" className="login-btn btn btn-outline-dark fw-semibold w-100">Đặt lại</button>
              </div>
              <div className="col-6">
                <button type="submit" className="login-btn btn btn-dark fw-semibold w-100">Đăng nhập</button>
              </div>
            </div>

          </form>

          {/* CHƯA CÓ TÀI KHOẢN */}
          <div className="login-register-row">
            Bạn chưa có tài khoản?&nbsp;<Link to="/tai-khoan/dang-ky">Đăng ký</Link>
          </div>

          {/* DIVIDER */}
          <div className="login-divider">hoặc</div>

          {/* NÚT GOOGLE */}
          <button type="button" className="btn btn-outline-dark login-btn-google" onClick={handleGoogleLogin}>
            {/* Google "G" logo SVG chính thức */}
            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Đăng nhập bằng Google
          </button>
        </div>
      </div>
    </>
  );
}
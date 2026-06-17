// frontend\src\pages\Register\index.jsx
import Breadcrumb from "../../../components/layout/Breadcrumb";
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleReset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
    };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: gọi API đăng nhập
    console.log({ email, password });
  };

   const handleGoogleLogin = () => {
    // 1. Định nghĩa các tham số cần thiết cho Google OAuth
    const params = new URLSearchParams({
      client_id: "368790655962-ac64i65olr3sb7k8mv5pbb18ak0ai2g4.apps.googleusercontent.com",
      redirect_uri: "http://localhost:8000/api/auth/google/callback",
      response_type: "code",
      scope: "openid email profile",
    });

    // 2. Chuyển hướng trình duyệt sang trang login của Google kèm theo các tham số đã build
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    console.log("Google login");
  };

  return (
    <>
      <Helmet><title>Đăng Ký | Selene</title></Helmet>
  
      <Breadcrumb
        items={[
          { label: "Trang chủ", path: "/" },
          { label: "Đăng ký" }
        ]}
      />

      {/* ── LOGIN PAGE ── */}
      <div className="login-page">
        <div className="login-card">
          <h1 className="form-title">Đăng ký</h1>

          <form onSubmit={handleSubmit} noValidate>

            {/* HỌ TÊN */}
            <div>
              <div className="form-label-row">
                <span className="form-label">Họ và tên</span>
              </div>
              <div className="form-input-wrap">
                <input type="text" className="form-control" placeholder="Nhập họ và tên" value={name} onChange={e => setName(e.target.value)} autoComplete="name" required />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <div className="form-label-row">
                <span className="form-label">Email</span>
              </div>
              <div className="form-input-wrap">
                <input type="email" className="form-control" placeholder="Nhập địa chỉ email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
              </div>
            </div>

            {/* SỐ ĐIỆN THOẠI */}
            <div>
              <div className="form-label-row">
                <span className="form-label">Số điện thoại</span>
              </div>
              <div className="form-input-wrap">
                <input type="tel" className="form-control" placeholder="Nhập số điện thoại" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" required />
              </div>
            </div>

            {/* MẬT KHẨU */}
            <div>
              <div className="form-label-row">
                <span className="form-label">Mật khẩu</span>
              </div>
              <div className="form-input-wrap">
                <input type={showPassword ? "text" : "password"} className="form-control has-eye" placeholder="Tạo mật khẩu" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
                <button type="button" className="form-eye" onClick={() => setShowPassword(s => !s)} tabIndex={-1} aria-label="Hiện/ẩn mật khẩu">
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
              </div>
            </div>

            {/* XÁC NHẬN MẬT KHẨU */}
            <div>
              <div className="form-label-row">
                <span className="form-label">Xác nhận mật khẩu</span>
              </div>
              <div className="form-input-wrap">
                <input type={showConfirmPassword ? "text" : "password"} className="form-control has-eye" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
                <button type="button" className="form-eye" onClick={() => setShowConfirmPassword(s => !s)} tabIndex={-1} aria-label="Hiện/ẩn mật khẩu">
                  <i className={`bi ${showConfirmPassword ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
              </div>
            </div>

            {/* CHECKBOX ĐỒNG Ý ĐIỀU KHOẢN */}
            <div className="form-check form-terms">
                <input className="form-check-input" type="checkbox" required />
                <label className="form-check-label">
                    Tôi đồng ý với{" "}
                    <Link to="/dieu-khoan-su-dung">Điều khoản sử dụng</Link>{" "}và{" "}<Link to="/chinh-sach-bao-mat">Chính sách bảo mật</Link>.
                </label>
            </div>

            {/* NÚT ĐĂNG NHẬP */}
            <div className="row">
              <div className="col-6">
                <button type="reset" onClick={handleReset} className="form-btn btn btn-outline-dark fw-semibold w-100">Đặt lại</button>
              </div>
              <div className="col-6">
                <button type="submit" className="form-btn btn btn-dark fw-semibold w-100">Đăng ký</button>
              </div>
            </div>
          </form>

          {/* ĐÃ CÓ TÀI KHOẢN */}
          <div className="form-register-row">
            Bạn đã có tài khoản?&nbsp;<Link to="/tai-khoan/dang-nhap">Đăng nhập</Link>
          </div>

          {/* DIVIDER */}
          <div className="form-divider">hoặc</div>

          {/* NÚT GOOGLE */}
          <button type="button" className="btn btn-outline-dark form-btn-google" onClick={handleGoogleLogin}>
            {/* Google "G" logo SVG chính thức */}
            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Tiếp tục với Google
          </button>
        </div>
      </div>
    </>
  );
}
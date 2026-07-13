// frontend\src\pages\Register\index.jsx
import Breadcrumb from "../../../components/layout/Breadcrumb";
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveLogin } from "../../../utils/auth";
import { toast } from "react-toastify";
import { register } from "../../../services/auth.service";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^0\d{9}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,50}$/;
  const navigate = useNavigate();

  const handleReset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setConfirmPassword("");
    setAgree(false);
  };

  // Hàm chuẩn hóa họ tên
  const normalizeFullName = (fullName) => {
    return fullName
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
      .split(" ")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const formattedName = normalizeFullName(name);

      const res = await register({
        email: email.trim(),
        phone: phone.trim(),
        password,
        full_name: formattedName,
      });

      toast.success(res.data.message);
      navigate("/");
      handleReset();

    } catch (err) {
      toast.error(
        err.response?.data?.message || "Đăng ký thất bại!"
      );
    }
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

  const validateForm = () => {
    const trimmedName = name.trim();

    // Họ tên
    if (!trimmedName) {
      toast.error("Vui lòng nhập họ tên");
      return false;
    }

    if (trimmedName.length < 2) {
      toast.error("Họ tên phải từ 2 ký tự trở lên");
      return false;
    }

    if (trimmedName.length > 100) {
      toast.error("Họ tên không được vượt quá 100 ký tự");
      return false;
    }

    if (!/[a-zA-ZÀ-ỹ]/.test(trimmedName)) {
      toast.error("Họ tên không hợp lệ");
      return false;
    }

    // Email
    if (!email.trim()) {
      toast.error("Vui lòng nhập email");
      return false;
    }

    if (!emailRegex.test(email)) {
      toast.error("Email không đúng định dạng");
      return false;
    }

    // SĐT
    if (!phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại");
      return false;
    }

    if (!phoneRegex.test(phone)) {
      toast.error("Số điện thoại không hợp lệ");
      return false;
    }

    // Mật khẩu
    if (!password) {
      toast.error("Vui lòng nhập mật khẩu");
      return false;
    }

    if (!passwordRegex.test(password)) {
      toast.error(
        "Mật khẩu phải từ 8-50 ký tự, gồm chữ hoa, chữ thường và số"
      );
      return false;
    }

    // Xác nhận mật khẩu
    if (!confirmPassword.trim()) {
      toast.error("Vui lòng nhập xác nhận mật khẩu");
      return false;
    }

    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return false;
    }

    // Điều khoản
    if (!agree) {
      toast.error("Bạn phải đồng ý điều khoản sử dụng");
      return false;
    }

    return true;
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
                <span className="form-label">Họ và tên <span className="text-danger">*</span></span>
              </div>
              <div className="form-input-wrap">
                <input type="text" className="form-control" placeholder="Nhập họ và tên" value={name} onChange={e => setName(e.target.value)} onBlur={() => { if (name.trim()) { setName(normalizeFullName(name)); }}} autoComplete="name" maxLength={100} required />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <div className="form-label-row">
                <span className="form-label">Email <span className="text-danger">*</span></span>
              </div>
              <div className="form-input-wrap">
                <input type="email" className="form-control" placeholder="Nhập địa chỉ email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" maxLength={100} required />
              </div>
            </div>

            {/* SỐ ĐIỆN THOẠI */}
            <div>
              <div className="form-label-row">
                <span className="form-label">Số điện thoại <span className="text-danger">*</span></span>
              </div>
              <div className="form-input-wrap">
                <input type="tel" className="form-control" placeholder="Nhập số điện thoại" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" maxLength={10} required />
              </div>
            </div>

            {/* MẬT KHẨU */}
            <div>
              <div className="form-label-row">
                <span className="form-label">Mật khẩu <span className="text-danger">*</span></span>
              </div>
              <div className="form-input-wrap">
                <input type={showPassword ? "text" : "password"} className="form-control has-eye" placeholder="Tạo mật khẩu" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" maxLength={50} required />
                <button type="button" className="form-eye" onClick={() => setShowPassword(s => !s)} tabIndex={-1} aria-label="Hiện/ẩn mật khẩu">
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
              </div>
            </div>

            {/* XÁC NHẬN MẬT KHẨU */}
            <div>
              <div className="form-label-row">
                <span className="form-label">Xác nhận mật khẩu <span className="text-danger">*</span></span>
              </div>
              <div className="form-input-wrap">
                <input type={showConfirmPassword ? "text" : "password"} className="form-control has-eye" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" maxLength={50} required />
                <button type="button" className="form-eye" onClick={() => setShowConfirmPassword(s => !s)} tabIndex={-1} aria-label="Hiện/ẩn mật khẩu">
                  <i className={`bi ${showConfirmPassword ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
              </div>
            </div>

            {/* CHECKBOX ĐỒNG Ý ĐIỀU KHOẢN */}
            <div className="form-check form-terms">
                <input className="form-check-input" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
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
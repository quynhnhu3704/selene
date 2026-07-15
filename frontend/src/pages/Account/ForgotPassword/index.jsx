// frontend\src\pages\Account\ForgotPassword\index.jsx
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import Breadcrumb from "../../../components/layout/Breadcrumb";
import { forgotPassword } from "../../../services/auth.service";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const handleReset = () => {
    setEmail("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Vui lòng nhập email");
      return;
    }

    if (!emailRegex.test(email)) {
      toast.error("Email không đúng định dạng");
      return;
    }

    try {
      const res = await forgotPassword({
        email: email.trim(),
      });

      toast.success(res.data.message);
      setEmail("");

    } catch (err) {
      toast.error(err.response?.data?.message || "Khôi phục mật khẩu thất bại!");
    }
  };

  return (
    <>
      <Helmet>
        <title>Quên Mật Khẩu | Selene</title>
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
                <span className="form-label">Email <span className="text-danger">*</span></span>
              </div>

              <div className="form-input-wrap">
                <input type="email" className="form-control" placeholder="Nhập email đã đăng ký" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={100} autoComplete="email" required />
              </div>
            </div>

            <div className="row">
              <div className="col-6">
                <button type="reset" onClick={handleReset} className="form-btn btn btn-outline-dark fw-semibold w-100">Đặt lại</button>
              </div>

              <div className="col-6">
                <button type="submit" className="form-btn btn btn-dark fw-semibold w-100"><i className="bi bi-send me-1"></i> Gửi</button>
              </div>
            </div>

          </form>

          <div className="form-register-row">
            <Link to="/tai-khoan/dang-nhap"><i className="bi bi-arrow-left me-1"></i> Quay lại đăng nhập</Link>
          </div>

        </div>
      </div>
    </>
  );
}
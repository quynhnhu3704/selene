// frontend\src\pages\Account\Profile\components\PasswordPanel.jsx
import { useState } from "react";
import { toast } from "react-toastify";
import { changePassword } from "../../../../services/user.service";
import { useNavigate } from "react-router-dom";
import { logout } from "../../../../services/auth.service";
import { logout as clearLogin } from "../../../../utils/auth";

export default function PasswordPanel() {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleReset = () => {
    setOldPassword("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!oldPassword.trim()) {
      toast.error("Vui lòng nhập mật khẩu hiện tại");
      return;
    }

    if (!password) {
      toast.error("Vui lòng nhập mật khẩu mới");
      return;
    }

    // Giữ nguyên logic validate của Register
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,50}$/;
    if (!passwordRegex.test(password)) {
      toast.error(
        "Mật khẩu phải từ 8-50 ký tự, gồm chữ hoa, chữ thường và số"
      );
      return;
    }

    if (oldPassword === password) {
      toast.error("Mật khẩu mới không được trùng với mật khẩu hiện tại");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    if (!confirmPassword.trim()) {
      toast.error("Vui lòng nhập xác nhận mật khẩu");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      // Giữ nguyên logic gọi API cũ: gửi đúng trường `newPassword` lên backend
      const res = await changePassword({
        oldPassword,
        newPassword: password
      });

      toast.success(res.data.message);
      handleReset();

      setTimeout(async () => {
        try {
          await logout();
        } catch (err) {
          console.log(err);
        }

        clearLogin();

        window.dispatchEvent(
          new Event("login-success")
        );

        window.location.href = "/tai-khoan/dang-nhap";
      }, 1800);

    } catch (err) {
      toast.error(
        err.response?.data?.message ||
        "Đổi mật khẩu thất bại"
      );
    }
  };

  return (
    <>
      <h5 className="panel-title">ĐỔI MẬT KHẨU</h5>          
        <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 420 }}>

          {/* MẬT KHẨU HIỆN TẠI */}
          <div>
            <div className="form-label-row">
              <span className="form-label">Mật khẩu hiện tại <span className="text-danger">*</span></span>
            </div>
            <div className="form-input-wrap">
              <input type={showOldPassword ? "text" : "password"} className="form-control has-eye" placeholder="Nhập mật khẩu hiện tại" value={oldPassword} onChange={e => setOldPassword(e.target.value)} autoComplete="current-password" maxLength={50} required />
              <button type="button" className="form-eye" onClick={() => setShowOldPassword(s => !s)} tabIndex={-1} aria-label="Hiện/ẩn mật khẩu">
                <i className={`bi ${showOldPassword ? "bi-eye-slash" : "bi-eye"}`} />
              </button>
            </div>
          </div>

          {/* MẬT KHẨU MỚI */}
          <div>
            <div className="form-label-row">
              <span className="form-label">Mật khẩu mới <span className="text-danger">*</span></span>
            </div>
            <div className="form-input-wrap">
              <input type={showPassword ? "text" : "password"} className="form-control has-eye" placeholder="Nhập mật khẩu mới" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" maxLength={50} required />
              <button type="button" className="form-eye" onClick={() => setShowPassword(s => !s)} tabIndex={-1} aria-label="Hiện/ẩn mật khẩu">
                <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
              </button>
            </div>
          </div>

          {/* XÁC NHẬN MẬT KHẨU MỚI */}
          <div>
            <div className="form-label-row">
              <span className="form-label">Xác nhận mật khẩu mới <span className="text-danger">*</span></span>
            </div>
            <div className="form-input-wrap">
              <input type={showConfirmPassword ? "text" : "password"} className="form-control has-eye" placeholder="Nhập lại mật khẩu mới" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" maxLength={50} required />
              <button type="button" className="form-eye" onClick={() => setShowConfirmPassword(s => !s)} tabIndex={-1} aria-label="Hiện/ẩn mật khẩu">
                <i className={`bi ${showConfirmPassword ? "bi-eye-slash" : "bi-eye"}`} />
              </button>
            </div>
          </div>

          {/* CỤM NÚT HÀNH ĐỘNG */}
          <div className="row mt-4">
            <div className="col-6">
              <button type="reset" onClick={handleReset} className="form-btn btn btn-outline-dark fw-semibold w-100">Đặt lại</button>
            </div>
            <div className="col-6">
              <button type="submit" className="form-btn btn btn-dark fw-semibold w-100">Cập nhật</button>
            </div>
          </div>
        </form>
    </>
  );
}
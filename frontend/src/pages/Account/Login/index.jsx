// import Breadcrumb from "../../components/layout/Breadcrumb";
// import { Helmet } from "react-helmet-async";

// export default function Login() {
//   return (
//     <>
//         <Helmet><title>Đăng Nhập | Selene</title></Helmet>

//         <Breadcrumb
//             items={[
//             { label: "Trang chủ", path: "/" },
//             { label: "Đăng nhập" }
//             ]}
//         />

//       <div className="container py-5">
//         <div className="row justify-content-center">
//           <div className="col-md-5">

//             <h2 className="mb-4 text-center">
//               Đăng nhập
//             </h2>

//             <form>
//               <div className="mb-3">
//                 <label className="form-label">
//                   Email
//                 </label>

//                 <input
//                   type="email"
//                   className="form-control"
//                 />
//               </div>

//               <div className="mb-3">
//                 <label className="form-label">
//                   Mật khẩu
//                 </label>

//                 <input
//                   type="password"
//                   className="form-control"
//                 />
//               </div>

//               <button
//                 type="submit"
//                 className="btn btn-dark w-100"
//               >
//                 Đăng nhập
//               </button>

//             </form>

//           </div>
//         </div>
//       </div>
//     </>
//   );
// }



// frontend\src\pages\Login.jsx
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
      <style>{`
        /* ── BREADCRUMB ── */
        .login-breadcrumb-wrap {
          padding: 14px 75px;
          background: #fff;
          border-bottom: 1px solid #f0f0f0;
        }

        /* ── PAGE WRAPPER ── */
        .login-page {
          min-height: calc(100vh - 140px);
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 16px 64px;
        }

        /* ── CARD ── */
        .login-card {
          width: 100%;
          max-width: 420px;
        }

        /* ── TITLE ── */
        .login-title {
          font-size: 22px;
          font-weight: 800;
          color: #111;
          text-align: center;
          margin-bottom: 28px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }

        /* ── LABEL ROW ── */
        .login-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 7px;
        }
        .login-label {
          font-size: 14.5px;
          font-weight: 600;
          color: #111;
        }
        .login-link-sm {
          font-size: 13.5px;
          font-weight: 500;
          color: #b8860b;
          text-decoration: none;
        }
        .login-link-sm:hover {
          color: #871B1B;
          text-decoration: underline;
        }

        /* ── INPUT ── */
        .login-input-wrap {
          position: relative;
          margin-bottom: 18px;
        }
        .login-input {
          width: 100%;
          border: 1.5px solid #d8d8d8;
          border-radius: 10px;
          padding: 13px 16px;
          font-size: 14px;
          font-family: 'Montserrat', sans-serif;
          color: #333;
          outline: none;
          background: #fff;
          transition: border-color 0.2s;
        }
        .login-input::placeholder { color: #bbb; }
        .login-input:focus { border-color: #b8860b; }

        /* password eye */
        .login-eye {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #888;
          font-size: 17px;
          padding: 0;
          display: flex;
          align-items: center;
        }
        .login-input.has-eye { padding-right: 44px; }

        /* ── BTN ĐĂNG NHẬP ── */
        .login-btn-primary {
          width: 100%;
          padding: 14px;
          border-radius: 30px;
          background: #b8860b;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          font-family: 'Montserrat', sans-serif;
          border: none;
          cursor: pointer;
          letter-spacing: 0.5px;
          transition: background 0.2s, transform 0.1s;
          margin-bottom: 16px;
        }
        .login-btn-primary:hover { background: #9a700a; }
        .login-btn-primary:active { transform: scale(0.98); }

        /* ── LINK ĐĂNG KÝ ── */
        .login-register-row {
          text-align: center;
          font-size: 13.5px;
          color: #555;
          margin-bottom: 20px;
        }
        .login-register-row a {
          color: #b8860b;
          font-weight: 600;
          text-decoration: none;
        }
        .login-register-row a:hover { color: #871B1B; text-decoration: underline; }

        /* ── DIVIDER ── */
        .login-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
          color: #aaa;
          font-size: 13px;
        }
        .login-divider::before,
        .login-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #e0e0e0;
        }

        /* ── BTN GOOGLE ── */
        .login-btn-google {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1.5px solid #d8d8d8;
          background: #fff;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Montserrat', sans-serif;
          color: #333;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .login-btn-google:hover {
          border-color: #4285F4;
          box-shadow: 0 2px 8px rgba(66,133,244,0.15);
        }
        .login-btn-google svg {
          flex-shrink: 0;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 575px) {
          .login-breadcrumb-wrap { padding: 12px 18px; }
          .login-page { padding: 32px 16px 48px; }
          .login-title { font-size: 19px; }
        }
      `}</style>

      {/* ── BREADCRUMB ── */}
      <div className="login-breadcrumb-wrap">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <Link to="/">Trang chủ</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Đăng nhập
            </li>
          </ol>
        </nav>
      </div>

      {/* ── LOGIN PAGE ── */}
      <div className="login-page">
        <div className="login-card">

          <h1 className="login-title">Đăng nhập</h1>

          <form onSubmit={handleSubmit} noValidate>

            {/* EMAIL */}
            <div>
              <div className="login-label-row">
                <span className="login-label">Email</span>
                <Link to="/chon-nguoi-dung" className="login-link-sm">
                  Chọn một người dùng
                </Link>
              </div>
              <div className="login-input-wrap">
                <input
                  type="email"
                  className="login-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* MẬT KHẨU */}
            <div>
              <div className="login-label-row">
                <span className="login-label">Mật khẩu</span>
                <Link to="/dat-lai-mat-khau" className="login-link-sm">
                  Đặt lại mật khẩu
                </Link>
              </div>
              <div className="login-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  className="login-input has-eye"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPassword(s => !s)}
                  tabIndex={-1}
                  aria-label="Hiện/ẩn mật khẩu"
                >
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
              </div>
            </div>

            {/* NÚT ĐĂNG NHẬP */}
            <button type="submit" className="login-btn-primary">
              Đăng nhập
            </button>

          </form>

          {/* CHƯA CÓ TÀI KHOẢN */}
          <div className="login-register-row">
            Bạn chưa có tài khoản?&nbsp;
            <Link to="/dang-ky">Đăng ký</Link>
          </div>

          {/* DIVIDER */}
          <div className="login-divider">- hoặc -</div>

          {/* NÚT GOOGLE */}
          <button
            type="button"
            className="login-btn-google"
            onClick={handleGoogleLogin}
          >
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
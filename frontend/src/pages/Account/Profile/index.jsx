// frontend\src\pages\Account\Profile\index.jsx
import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import Breadcrumb from "../../../components/layout/Breadcrumb";
import { getProfile } from "../../../services/user.service";
import { saveUser } from "../../../utils/auth";
import { toast } from "react-toastify";
import { NAV } from "./constants";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const location = useLocation();
  const breadcrumbItems = {
    "/tai-khoan": [
      { label: "Trang chủ", path: "/" },
      { label: "Tài khoản của tôi" },
    ],

    "/tai-khoan/don-hang": [
      { label: "Trang chủ", path: "/" },
      { label: "Tài khoản của tôi", path: "/tai-khoan" },
      { label: "Đơn hàng của bạn" },
    ],

    "/tai-khoan/doi-mat-khau": [
      { label: "Trang chủ", path: "/" },
      { label: "Tài khoản của tôi", path: "/tai-khoan" },
      { label: "Đổi mật khẩu" },
    ],
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        setProfile(res.data.profile);
        saveUser(res.data.profile);
      } catch (err) {
        toast.error(
          err.response?.data?.message ||
          "Không thể tải thông tin tài khoản"
        );
      }
    };
    fetchProfile();
  }, []);

  return (
    <>
      <Helmet><title>Tài Khoản Của Tôi | Selene</title></Helmet>

      <Breadcrumb
        items={
          breadcrumbItems[location.pathname] ||
          breadcrumbItems["/tai-khoan"]
        }
      />

      <style>{`
        /* ── ACCOUNT PAGE ── */
        .acc-page { padding: 40px 75px 72px; background: #fff; min-height: 70vh; }

        /* SIDEBAR */
        .acc-sidebar { border-right: 1px solid #f0f0f0; padding-right: 32px; }
        .acc-sidebar-heading { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #212529; margin-bottom: 4px; }
        .acc-greeting { font-size: 14px; color: #6c757d; margin-bottom: 24px; }
        .acc-greeting strong { color: #212529; }
        .acc-nav { list-style: none; padding: 0; margin: 0 0 32px; }
        .acc-nav li { border-bottom: 1px solid #f5f5f5; }
        .acc-nav li:last-child { border-bottom: none; }
        .acc-nav-btn {
          display: block; width: 100%; text-align: left;
          background: none; border: none; padding: 11px 0;
          font-size: 14.5px; font-weight: 500; color: #444;
          cursor: pointer; transition: color 0.15s;
          font-family: 'Nunito', sans-serif;
        }
        .acc-nav-btn:hover { color: #871B1B; }
        .acc-nav-btn.active { color: #871B1B; font-weight: 700; }

        /* Logout button */
        .acc-logout-btn {
          display: flex; align-items: center; gap: 7px;
          background: none; border: none; padding: 0;
          font-size: 14px; color: #aaa; cursor: pointer;
          font-family: 'Nunito', sans-serif; transition: color 0.15s;
        }
        .acc-logout-btn:hover { color: #871B1B; }

        /* RIGHT PANEL */
        .acc-panel { padding-left: 40px; }


        /* Empty state */
        .acc-empty { text-align: center; padding: 48px 0; color: #aaa; }
        .acc-empty-icon { font-size: 48px; color: #d0d0d0; }

        /* Responsive */
        @media (max-width: 1520px) { .acc-page { padding: 32px 24px 56px; } }
        @media (max-width: 768px) {
          .acc-sidebar { border-right: none; border-bottom: 1px solid #f0f0f0; padding-right: 0; padding-bottom: 20px; margin-bottom: 24px; }
          .acc-panel { padding-left: 0; }
        }
      `}</style>

      <div className="acc-page">
        <div className="row g-0">

          {/* ══════ SIDEBAR ══════ */}
          <div className="col-12 col-md-3 acc-sidebar">

            <p className="acc-sidebar-heading">TRANG TÀI KHOẢN</p>
            <p className="acc-greeting">Xin chào, <strong>{profile?.full_name || ""} !</strong></p>

            <ul className="acc-nav">
              {NAV.map((item) => (
                <li key={item.key}>
                  <NavLink to={item.path} className={({ isActive }) => `acc-nav-btn${isActive ? " active" : ""}`}>{item.label}</NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* ══════ MAIN PANEL ══════ */}
          <div className="col-12 col-md-9 acc-panel">
            <Outlet context={{ profile, setProfile, }} />
          </div>

        </div>
      </div>
    </>
  );
}
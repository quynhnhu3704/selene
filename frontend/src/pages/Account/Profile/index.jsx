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

      <div className="acc-page">
        <div className="row g-0">

          {/* ══════ SIDEBAR ══════ */}
          <div className="col-12 col-md-3 page-sidebar">

            <p className="page-sidebar-heading">TRANG TÀI KHOẢN</p>
            <p className="page-greeting">Xin chào, <strong>{profile?.full_name || ""} !</strong></p>

            <ul className="page-nav">
              {NAV.map((item) => (
                <li key={item.key}>
                  <NavLink to={item.path} end={item.path === "/tai-khoan"} className={({ isActive }) => `page-nav-btn${isActive ? " active" : ""}`}>{item.label}</NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* ══════ MAIN PANEL ══════ */}
          <div className="col-12 col-md-9 page-panel">
            <Outlet context={{ profile, setProfile, }} />
          </div>

        </div>
      </div>
    </>
  );
}
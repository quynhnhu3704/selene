// frontend\src\pages\Admin\index.jsx
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Swal from "sweetalert2";
import logo from "../../assets/images/logo.png";

const MENU = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "bi-speedometer2",
    path: "/admin",
  },
  {
    key: "products",
    label: "Sản phẩm",
    icon: "bi-box-seam",
    path: "/admin/san-pham",
  },
  {
    key: "orders",
    label: "Đơn hàng",
    icon: "bi-receipt",
    path: "/admin/don-hang",
  },
  {
    key: "users",
    label: "Người dùng",
    icon: "bi-people",
    path: "/admin/nguoi-dung",
  },
  {
    key: "categories",
    label: "Danh mục",
    icon: "bi-tag",
    path: "/admin/danh-muc",
  },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const active = (path) =>
    path === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(path);

  const handleGoToStore = () => {
    navigate("/");
  };

  return (
    <>
      <Helmet>
        <title>Admin | Selene</title>
      </Helmet>

      <style>{`
        .adm-wrap   { display: flex; min-height: 100vh; background: #f8f9fa; }

        /* ── SIDEBAR ── */
        .adm-sidebar {
          width: ${collapsed ? "68px" : "230px"};
          min-height: 100vh;
          background: #212529;
          display: flex; flex-direction: column;
          transition: width 0.22s ease;
          flex-shrink: 0;
          position: sticky; top: 0; height: 100vh; overflow: hidden;
        }
        .adm-logo-wrap {
          height: 68px; display: flex; align-items: center;
          padding: ${collapsed ? "0 14px" : "0 20px"};
          border-bottom: 1px solid rgba(255,255,255,0.07);
          gap: 10px; flex-shrink: 0;
        }
        .adm-logo-img { height: 36px; filter: brightness(0) invert(1); flex-shrink: 0; }
        .adm-logo-text {
          font-size: 15px; font-weight: 800; color: #fff;
          letter-spacing: 2px; text-transform: uppercase;
          white-space: nowrap;
          opacity: ${collapsed ? 0 : 1};
          transition: opacity 0.15s;
        }

        .adm-nav { flex: 1; padding: 12px 0; overflow-y: auto; scrollbar-width: none; }
        .adm-nav::-webkit-scrollbar { display: none; }

        .adm-nav-label {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 1.2px; color: rgba(255,255,255,0.3);
          padding: 16px 20px 6px;
          display: ${collapsed ? "none" : "block"};
        }

        .adm-nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: ${collapsed ? "11px 0" : "11px 20px"};
          justify-content: ${collapsed ? "center" : "flex-start"};
          font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.6);
          text-decoration: none; cursor: pointer;
          border-left: 3px solid transparent;
          transition: all 0.15s; white-space: nowrap;
          position: relative;
        }
        .adm-nav-item:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .adm-nav-item.active {
          color: #fff; background: rgba(255,255,255,0.1);
          border-left-color: #fff;
        }
        .adm-nav-item i { font-size: 17px; flex-shrink: 0; }
        .adm-nav-item span {
          opacity: ${collapsed ? 0 : 1};
          width: ${collapsed ? 0 : "auto"};
          overflow: hidden; transition: opacity 0.15s;
        }

        /* tooltip khi collapsed */
        .adm-nav-item[data-tip]:hover::after {
          content: attr(data-tip);
          display: ${collapsed ? "block" : "none"};
          position: absolute; left: 68px; top: 50%;
          transform: translateY(-50%);
          background: #333; color: #fff;
          font-size: 12px; padding: 4px 10px; border-radius: 6px;
          white-space: nowrap; z-index: 9999;
        }

        .adm-sidebar-footer {
          padding: ${collapsed ? "12px 0" : "12px 12px"};
          border-top: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }
        .adm-store-btn {
          display: flex; align-items: center; gap: 10px;
          justify-content: ${collapsed ? "center" : "flex-start"};
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.45); font-size: 13.5px; font-weight: 600;
          font-family: 'Nunito', sans-serif;
          padding: ${collapsed ? "8px 0" : "8px 10px"};
          border-radius: 8px; width: 100%;
          transition: all 0.15s;
        }

        .adm-store-btn:hover {
          color: #fff;
          background: rgba(255,255,255,0.07);
        }

        .adm-store-btn span {
          display: ${collapsed ? "none" : "inline"};
        }

        /* ── MAIN ── */
        .adm-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

        .adm-topbar {
          height: 68px; background: #fff;
          border-bottom: 1px solid #eee;
          display: flex; align-items: center;
          padding: 0 28px; gap: 16px;
          position: sticky; top: 0; z-index: 100;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .adm-toggle-btn {
          background: none; border: none; cursor: pointer;
          color: #555; font-size: 20px; padding: 4px 6px;
          border-radius: 6px; display: flex; align-items: center;
          transition: background 0.15s;
        }
        .adm-toggle-btn:hover { background: #f3f3f3; }

        .adm-topbar-title {
          font-size: 16px; font-weight: 800; color: #212529;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .adm-topbar-right {
          margin-left: auto; display: flex; align-items: center; gap: 14px;
        }
        .adm-admin-badge {
          display: flex; align-items: center; gap: 8px;
          font-size: 13.5px; font-weight: 700; color: #212529;
        }
        .adm-admin-ava {
          width: 34px; height: 34px; border-radius: 50%;
          background: #212529; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800; flex-shrink: 0;
        }

        .adm-content { flex: 1; padding: 28px; }
      `}</style>

      <div className="adm-wrap">
        {/* ── SIDEBAR ── */}
        <aside className="adm-sidebar">
          <div className="adm-logo-wrap">
            <img src={logo} alt="logo" className="adm-logo-img" />
            <span className="adm-logo-text">Selene</span>
          </div>

          <nav className="adm-nav">
            <div className="adm-nav-label">Tổng quan</div>

            {MENU.map((item) => (
              <Link
                key={item.key}
                to={item.path}
                className={`adm-nav-item${active(item.path) ? " active" : ""}`}
                data-tip={item.label}
              >
                <i className={`bi ${item.icon}`} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="adm-sidebar-footer">
            <button className="adm-store-btn" onClick={handleGoToStore}>
              <i className="bi bi-shop" style={{ fontSize: 17 }} />
              <span>Về cửa hàng</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN AREA ── */}
        <div className="adm-main">
          <div className="adm-topbar">
            <button
              className="adm-toggle-btn"
              onClick={() => setCollapsed((c) => !c)}
            >
              <i
                className={`bi ${collapsed ? "bi-layout-sidebar-inset" : "bi-layout-sidebar-inset-reverse"}`}
              />
            </button>
            <span className="adm-topbar-title">
              {MENU.find((m) => active(m.path))?.label ?? "Admin"}
            </span>
            <div className="adm-topbar-right">
              <div className="adm-admin-badge">
                <div className="adm-admin-ava">A</div>
                Admin
              </div>
            </div>
          </div>

          <div className="adm-content">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}

// frontend\src\pages\Admin\index.jsx
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import defaultAvatar from "../../assets/images/default-avatar.png";
import { getProfile } from "../../services/user.service";
import logoIcon from "../../assets/images/icon.png";

const MENU_ITEMS = [
  {
    key: "home",
    label: "Trang chủ",
    icon: "bi-house",
    path: "/admin",
    enabled: true,
  },
  {
    key: "orders",
    label: "Đơn hàng",
    icon: "bi-list-ul",
    path: "/admin/don-hang",
    enabled: true,
  },
  {
    key: "products",
    label: "Sản phẩm",
    icon: "bi-grid",
    path: "/admin/san-pham",
    enabled: true,
  },
  {
    key: "customers",
    label: "Khách hàng",
    icon: "bi-people",
    path: "/admin/nguoi-dung",
    enabled: true,
  },
  {
    key: "discounts",
    label: "Danh mục",
    icon: "bi-percent",
    path: "/admin/danh-muc",
    enabled: true,
  },
  {
    key: "store",
    label: "Cửa hàng",
    icon: "bi-shop",
    path: "/",
    enabled: true,
  },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        setProfile(res.data.profile);
      } catch (error) {
        console.error("Không thể lấy thông tin admin:", error);
      }
    };

    fetchProfile();
  }, []);

  const isActive = (path) => {
    if (!path) return false;
    if (path === "/admin") return location.pathname === "/admin";
    if (path === "/") return false;
    return location.pathname.startsWith(path);
  };

  const renderItem = (item) => {
    const activeItem = isActive(item.path);
    const content = (
      <>
        <i className={`bi ${item.icon}`} />
        <span className="adm-nav-label-txt">
          {item.realLabel || item.label}
        </span>
        {item.badge ? (
          <span className="adm-nav-badge">{item.badge}</span>
        ) : null}
        {item.chevron ? (
          <i className="bi bi-chevron-down adm-nav-chevron" />
        ) : null}
      </>
    );

    if (!item.enabled) {
      return (
        <span
          key={item.key}
          className="adm-nav-item disabled"
          data-tip="Sắp ra mắt"
        >
          {content}
        </span>
      );
    }

    return (
      <Link
        key={item.key}
        to={item.path}
        className={`adm-nav-item${activeItem ? " active" : ""}`}
        data-tip={item.realLabel || item.label}
      >
        {content}
      </Link>
    );
  };

  const getRoleName = (roleId) => {
    switch (Number(roleId)) {
      case 1:
        return "Chủ cửa hàng";
      case 2:
        return "Nhân viên";
      case 3:
        return "Khách hàng";
      default:
        return "Không xác định";
    }
  };

  return (
    <>
      <style>{`
        // .adm-wrap { display: flex; min-height: 100vh; background: #fff; }
        .adm-wrap {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #efefed;
}

.adm-main {
  flex: 1;
  min-width: 0;

  margin: 0.75em 0.75em 0.75em 0;

  display: flex;
  flex-direction: column;

  background: #fff;
  border-radius: 1em;

  overflow: hidden;
}

.adm-topbar {
  flex-shrink: 0;

  height: 76px;
  background: #fff;

  display: flex;
  align-items: center;

  padding: 0 32px;

  position: sticky;
  top: 0;
  z-index: 100;

  border-radius: 1em 1em 0 0;
}

.adm-content {
  flex: 1;
  min-height: 0;

  padding: 28px 32px 40px;

  background: #fff;

  overflow-y: auto;

  border-radius: 0 0 1em 1em;
}





        /* ── SIDEBAR ── */
        .adm-sidebar {
          width: ${collapsed ? "76px" : "252px"};
          min-height: 100vh;
          background: #efefed;
          display: flex; flex-direction: column;
          transition: width 0.22s ease;
          flex-shrink: 0;
          position: sticky; top: 0; height: 100vh; overflow: hidden;
        }

        .adm-logo-row {
          height: 64px; display: flex; align-items: center; justify-content: space-between;
          padding: 0 16px; flex-shrink: 0;
        }
        .adm-logo-left { display: flex; align-items: center; gap: 9px; min-width: 0; }
        .adm-logo-icon {
          width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 15px;
        }
        .adm-logo-text {
          font-size: 15px; font-weight: 800; color: #17151F;
          white-space: nowrap; overflow: hidden;
          opacity: ${collapsed ? 0 : 1};
          width: ${collapsed ? 0 : "auto"};
          transition: opacity 0.15s;
        }
        .adm-logo-caret { font-size: 11px; color: #9CA0AC; display: ${collapsed ? "none" : "inline-block"}; }
        .adm-collapse-btn {
          width: 28px; height: 28px; border-radius: 8px; border: 1px solid #ECEBF2;
          background: #fff; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #6B7280; font-size: 13px; flex-shrink: 0; padding: 0;
          transition: background 0.15s;
        }
        .adm-collapse-btn:hover { background: #F1F0F7; }

        .adm-nav-scroll { flex: 1; overflow-y: auto; padding: 4px 12px 12px; scrollbar-width: none; }
        .adm-nav-scroll::-webkit-scrollbar { display: none; }
        
        .adm-nav-item {
          display: flex; align-items: center; gap: 11px;
          padding: ${collapsed ? "10px 0" : "9px 12px"};
          justify-content: ${collapsed ? "center" : "flex-start"};
          font-size: 13.5px; font-weight: 600; color: #444;
          text-decoration: none; cursor: pointer;
          border-radius: 10px; margin-bottom: 2px;
          transition: all 0.15s; white-space: nowrap; position: relative;
        }
        .adm-nav-item i:not(.adm-nav-chevron) { font-size: 16px; flex-shrink: 0; width: 16px; text-align: center; }
        .adm-nav-item:hover:not(.disabled) { color: #17151F; background: rgba(0,0,0,0.03); }
        .adm-nav-item.active {
          color: #17151F; background: #fff;
          border: 1px solid #ECEBF2;
          box-shadow: 0 1px 3px rgba(17,15,31,0.06);
          font-weight: 800;
        }
        .adm-nav-item.disabled { color: #C7C5D2; cursor: not-allowed; }
        .adm-nav-label-txt {
          overflow: hidden;
          opacity: ${collapsed ? 0 : 1};
          width: ${collapsed ? 0 : "auto"};
        }
        .adm-nav-badge {
          margin-left: auto; background: #EF4444; color: #fff;
          font-size: 10.5px; font-weight: 800; min-width: 18px; height: 18px;
          border-radius: 9px; display: ${collapsed ? "none" : "flex"};
          align-items: center; justify-content: center; padding: 0 5px;
        }
        .adm-nav-chevron { margin-left: auto; font-size: 11px; display: ${collapsed ? "none" : "inline-block"}; }

        .adm-nav-item[data-tip]:hover::after {
          content: attr(data-tip);
          display: ${collapsed ? "block" : "none"};
          position: absolute; left: 68px; top: 50%; transform: translateY(-50%);
          background: #17151F; color: #fff; font-size: 12px; font-weight: 600;
          padding: 4px 10px; border-radius: 6px; white-space: nowrap; z-index: 9999;
        }

        .adm-sidebar-bottom {
          padding: 10px 12px;
          flex-shrink: 0;
          display: flex;
          justify-content: ${collapsed ? "center" : "flex-end"};
        }

        /* ── MAIN ── */
        // .adm-main { flex: 1; min-width: 0; display: flex; flex-direction: column; background: #efefed; }

        // .adm-topbar {
        //   height: 76px; background: #fff; border-bottom: 0.1em solid #efefed;
        //   display: flex; align-items: center; padding: 0 32px; gap: 20px;
        //   position: sticky; top: 0; z-index: 100;
        //   border-radius: 1em 1em 0 0; margin: 1em 1em 0 0; 
        // }


        .adm-topbar-right { margin-left: auto; display: flex; align-items: center; gap: 22px; }

        .adm-store-link {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 700; color: #6B7280;
          text-decoration: none; padding: 8px 12px; border-radius: 10px;
          border: 1px solid #ECEBF2; transition: all 0.15s;
        }
        .adm-store-link:hover { color: #5B4FE0; border-color: #C9C3F8; background: #F8F7FC; }

        .adm-admin-badge { display: flex; align-items: center; gap: 10px; }
        .adm-admin-ava { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #ECEBF2; }
        .adm-admin-info { line-height: 1.25; }
        .adm-admin-name { font-size: 13.5px; font-weight: 800; color: #17151F; }
        .adm-admin-role { font-size: 12px; color: #9CA0AC; font-weight: 600; }

        // .adm-content { flex: 1; padding: 28px 32px 40px; background: #fff; border-radius: 0 0 1em 1em; margin: 0 1em 1em 0; }
        
      `}</style>

      <div className="adm-wrap">
        {/* ── SIDEBAR ── */}
        <aside className="adm-sidebar">
          <div className="adm-logo-row">
            <div className="adm-logo-left">
              <img src={logoIcon} alt="Selene" className="adm-logo-icon" />
              <span className="adm-logo-text">Selene</span>
            </div>
          </div>

          <nav className="adm-nav-scroll">{MENU_ITEMS.map(renderItem)}</nav>

          <div className="adm-sidebar-bottom">
            <button
              className="adm-collapse-btn"
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            >
              <i
                className={`bi ${
                  collapsed
                    ? "bi-layout-sidebar-inset"
                    : "bi-layout-sidebar-inset-reverse"
                }`}
              />
            </button>
          </div>
        </aside>

        {/* ── MAIN AREA ── */}
        <div className="adm-main">
          <div className="adm-topbar">
            <div className="adm-topbar-right">
              <Link
                to="/"
                target="_blank"
                rel="noopener noreferrer"
                className="adm-store-link"
              >
                <i className="bi bi-shop" /> Về cửa hàng
              </Link>

              <div className="adm-admin-badge">
                <img
                  src={profile?.avatar_url || defaultAvatar}
                  alt={profile?.full_name || "Admin"}
                  className="adm-admin-ava"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultAvatar;
                  }}
                />
                <div className="adm-admin-info">
                  <div className="adm-admin-name">
                    {profile?.full_name || "Chủ cửa hàng"}
                  </div>
                  <div className="adm-admin-role">
                    {getRoleName(profile?.role_id)}
                  </div>
                </div>
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

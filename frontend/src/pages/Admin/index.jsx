// frontend\src\pages\Admin\index.jsx
import Loading from "../../components/common/Loading";
import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import defaultAvatar from "../../assets/images/default-avatar.png";
import { getProfile } from "../../services/user.service";
import logoIcon from "../../assets/images/icon.png";
import UnreadBadge from "../../components/SupportChat/UnreadBadge";

const MENU_ITEMS = [
  {
    key: "support",
    label: "Chat hỗ trợ",
    icon: "bi-chat-dots",
    path: "/admin/ho-tro",
    enabled: true,
  },
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
    icon: "bi-receipt",
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
    key: "promotions",
    label: "Khuyến mãi & Ưu đãi",
    icon: "bi-tags",
    enabled: true,
    children: [
      {
        key: "product-promotions",
        label: "Khuyến mãi sản phẩm",
        icon: "bi-tag",
        path: "/admin/khuyen-mai/san-pham",
      },
      {
        key: "order-discounts",
        label: "Mã giảm giá đơn hàng",
        icon: "bi-ticket-perforated",
        path: "/admin/khuyen-mai/ma-giam-gia",
      },
    ],
  },
  {
    key: "customers",
    label: "Khách hàng",
    icon: "bi-people",
    path: "/admin/khach-hang",
    enabled: true,
  },
  {
    key: "staffs",
    label: "Nhân viên",
    icon: "bi-person-badge",
    path: "/admin/nhan-vien",
    enabled: true,
  },
  {
    key: "categories",
    label: "Danh mục",
    icon: "bi-tag",
    path: "/admin/danh-muc",
    enabled: true,
  },
  {
    key: "permissions",
    label: "Phân quyền",
    icon: "bi-shield-check",
    path: "/admin/phan-quyen",
    enabled: true,
  },
];

export default function AdminLayout() {
  const location = useLocation();
  // const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openMenus, setOpenMenus] = useState(() => ({
    promotions: location.pathname.startsWith("/admin/khuyen-mai"),
  }));

  const [previousPathname, setPreviousPathname] = useState(location.pathname);

  // Sync menu state only when the pathname changes, before rendering children.
  if (previousPathname !== location.pathname) {
    setPreviousPathname(location.pathname);
    if (location.pathname.startsWith("/admin/khuyen-mai")) {
      setOpenMenus((prev) => ({ ...prev, promotions: true }));
    }
  }

  const handleParentToggle = (item) => {
    if (collapsed) {
      setCollapsed(false);
      setOpenMenus((prev) => ({ ...prev, [item.key]: true }));
      return;
    }
    setOpenMenus((prev) => ({ ...prev, [item.key]: !prev[item.key] }));
  };

  useEffect(() => {
    let isCurrentRequest = true;
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        if (isCurrentRequest) setProfile(res.data.profile);
      } catch (error) {
        console.error("Không thể lấy thông tin admin:", error);
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isCurrentRequest = false;
    };
  }, []);

  const isActive = (path) => {
    if (!path) return false;
    if (path === "/admin") return location.pathname === "/admin";
    if (path === "/") return false;
    return location.pathname.startsWith(path);
  };

  const renderItem = (item) => {
    // Nếu có danh mục con (Sub-menu)
    if (item.children && item.children.length > 0) {
      const isChildActive = item.children.some((child) => isActive(child.path));
      const isOpen = Boolean(openMenus[item.key]);

      return (
        <div key={item.key} className="adm-nav-group">
          <button
            type="button"
            className={`adm-nav-item adm-nav-parent-btn${
              isChildActive ? " active-parent" : ""
            }`}
            onClick={() => handleParentToggle(item)}
            data-tip={item.label}
            aria-expanded={isOpen}
          >
            <i
              className={`bi ${item.icon}`}
              style={{ color: isChildActive ? "#0d6efd" : undefined }}
            />
            <span className="adm-nav-label-txt">{item.label}</span>
            <i
              className={`bi bi-chevron-down adm-nav-chevron ${
                isOpen ? "open" : ""
              }`}
            />
          </button>

          {!collapsed && isOpen && (
            <div className="adm-nav-submenu">
              {item.children.map((sub) => {
                const activeSub = isActive(sub.path);
                return (
                  <Link
                    key={sub.key}
                    to={sub.path}
                    className={`adm-nav-subitem${activeSub ? " active" : ""}`}
                    data-tip={sub.label}
                  >
                    <i className={`bi ${sub.icon}`} />
                    <span>{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    const activeItem = isActive(item.path);
    const content = (
      <>
        <i className={`bi ${item.icon}`} />
        <span className="adm-nav-label-txt">
          {item.realLabel || item.label}
          {item.key === "support" && <UnreadBadge admin />}
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

  if (loading) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "100vh" }}
      >
        <Loading text="Đang kiểm tra quyền truy cập..." />
      </div>
    );
  }

  if (!profile) return <Navigate to="/tai-khoan/dang-nhap" replace />;
  if (![1, 2].includes(Number(profile.role_id)))
    return <Navigate to="/" replace />;

  return (
    <>

      <div className={`adm-wrap${collapsed ? " adm-wrap--collapsed" : ""}`}>
        {/* ── SIDEBAR ── */}
        <aside className="adm-sidebar">
          <div className="adm-logo-row">
            <div className="adm-logo-left">
              <img src={logoIcon} alt="" className="adm-logo-icon" />
              <span className="adm-logo-text">Selene</span>
            </div>
          </div>

          <nav className="adm-nav-scroll">
            {MENU_ITEMS.filter(
              (item) =>
                item.key !== "permissions" || Number(profile?.role_id) === 1,
            ).map(renderItem)}
          </nav>

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
                className="form-btn btn btn-outline-danger fw-semibold px-4"
              >
                <i className="bi bi-shop me-1" /> Về cửa hàng
              </Link>

              <div className="adm-admin-badge">
                <img
                  src={profile?.avatar_url || defaultAvatar}
                  alt=""
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

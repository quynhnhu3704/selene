// frontend\src\components\layout\Header.jsx
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import { isLoggedIn, isAdmin, logout as clearLogin } from "../../utils/auth";
import { logout } from "../../services/auth.service";
import Swal from "sweetalert2";
import { useCart } from "../../context/CartContext";

// Mobile/tablet luôn dùng menu thu gọn; desktop còn kiểm tra chỗ trống thực tế.
const COMPACT_HEADER_QUERY =
  "(max-width: 1024px), (max-width: 1366px) and (hover: none) and (pointer: coarse)";

export default function Header() {
  const desktopHeaderRef = useRef(null);
  const [compact, setCompact] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [wl] = useState(0);
  const { cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLogin, setIsLogin] = useState(isLoggedIn());
  const [admin, setAdmin] = useState(isAdmin());

  const navClass = ({ isActive }) =>
    isActive ? "rb-navlink rb-active" : "rb-navlink";

  const handleProductSearch = (event) => {
    event.preventDefault();

    const query = searchQuery.trim();
    if (!query) return;

    const params = new URLSearchParams({ q: query });
    navigate(`/san-pham?${params.toString()}`);
    setSearchOpen(false);
  };

  // Lúc nào login thành công Header sẽ tự đổi
  useEffect(() => {
    const syncLogin = () => {
      setIsLogin(isLoggedIn());
      setAdmin(isAdmin());
    };
    window.addEventListener("storage", syncLogin);
    window.addEventListener("login-success", syncLogin);
    return () => {
      window.removeEventListener("storage", syncLogin);
      window.removeEventListener("login-success", syncLogin);
    };
  }, []);

  useEffect(() => {
    if (location.pathname !== "/san-pham") return;

    setSearchQuery(new URLSearchParams(location.search).get("q") || "");
  }, [location.pathname, location.search]);

  // Đo cả khi đang thu gọn để có thể trở lại desktop khi đủ chỗ.
  useLayoutEffect(() => {
    const header = desktopHeaderRef.current;
    const compactHeader = window.matchMedia(COMPACT_HEADER_QUERY);
    const syncHeader = () => {
      const requiredWidth = Array.from(header.children).reduce(
        (total, group) => total + group.getBoundingClientRect().width,
        24, // Chừa tối thiểu 12px ở mỗi bên, không sửa khoảng cách trong cụm.
      );
      const nextCompact =
        compactHeader.matches || requiredWidth > header.getBoundingClientRect().width;
      setCompact(nextCompact);
      if (!nextCompact) {
        setSearchOpen(false);
        setMenuOpen(false); // cũng đóng menu luôn cho sạch
      }
    };

    compactHeader.addEventListener("change", syncHeader);
    window.addEventListener("resize", syncHeader);
    const observer = new ResizeObserver(syncHeader);
    observer.observe(header);
    Array.from(header.children).forEach((group) => observer.observe(group));

    // Kiểm tra ngay khi component mount
    syncHeader();

    return () => {
      compactHeader.removeEventListener("change", syncHeader);
      window.removeEventListener("resize", syncHeader);
      observer.disconnect();
    };
  }, []);

  // Thêm đoạn này
  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Đăng xuất",
      text: "Bạn có chắc chắn muốn đăng xuất?",
      showCancelButton: true,
      confirmButtonText: "Đăng xuất",
      cancelButtonText: "Ở lại",
      reverseButtons: true,
      focusCancel: true,
      buttonsStyling: false,
      showIcon: false, // Đảm bảo không render icon mặc định

      customClass: {
        popup: "se-swal-popup",
        title: "se-swal-title",
        htmlContainer: "se-swal-text",
        confirmButton: "se-btn-confirm",
        cancelButton: "se-btn-cancel",
        actions: "se-swal-actions",
      },
    });

    // Người dùng bấm "Ở lại"
    if (!result.isConfirmed) return;

    try {
      await logout(); // gọi Backend xóa Refresh Token
    } catch (err) {
      console.log(err);
    }

    // Xóa AccessToken và User trong localStorage
    clearLogin();

    // Cập nhật Header
    window.dispatchEvent(new Event("login-success"));

    window.location.href = "/";
  };

  return (
    <>
      {/* ══════════════════════════════════
          DESKTOP HEADER
      ══════════════════════════════════ */}
      <div
        ref={desktopHeaderRef}
        className={`rb-desktop-header${compact ? " is-compact" : ""}`}
        aria-hidden={compact}
        inert={compact}
      >
        {/* CỘT 1: LOGO */}
        <div className="rb-col-logo">
          <Link to="/">
            <img src={logo} alt="logo" width={165} height={75} />
          </Link>
        </div>

        {/* CỘT 2: TOPBAR + NAV */}
        <div className="rb-col-center">
          {/* HÀNG 1: HOTLINE + SEARCH */}
          <div className="rb-topbar">
            <div className="rb-topbar-left">
              <span className="me-4">
                <i
                  className="bi bi-telephone-fill me-1"
                  style={{ fontSize: "1.125em" }}
                />{" "}
                HOTLINE:
                <a href="tel:0984624532" className="rb-toplink ms-1">
                  <strong style={{ fontSize: "16px" }}>098 462 4532</strong>
                </a>
              </span>
              <span className="mx-5">
                <i
                  className="bi bi-geo-alt-fill me-1"
                  style={{ fontSize: "1.125em" }}
                />
                <Link to="/" className="rb-toplink">
                  HỆ THỐNG CỬA HÀNG
                </Link>
              </span>
            </div>

            <form className="rb-search mx-5" onSubmit={handleProductSearch}>
              <div className="input-group">
                <input
                  className="form-control"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm tên hoặc mã sản phẩm..."
                  aria-label="Tìm tên hoặc mã sản phẩm"
                />
                <button className="input-group-text" type="submit">
                  <i className="bi bi-search" />
                </button>
              </div>
            </form>
          </div>

          {/* HÀNG 2: NAV LINKS */}
          <div className="rb-nav">
            <NavLink to="/" end className={navClass}>
              TRANG CHỦ
            </NavLink>
            <NavLink to="/san-pham" className={navClass}>
              SẢN PHẨM<i className="bi bi-caret-down ms-2 icon-down"></i>
              <i className="bi bi-caret-up ms-2 icon-up"></i>
            </NavLink>
            <NavLink to="/bo-suu-tap" className={navClass}>
              BỘ SƯU TẬP<i className="bi bi-caret-down ms-2 icon-down"></i>
              <i className="bi bi-caret-up ms-2 icon-up"></i>
            </NavLink>
            <NavLink to="/tin-tuc" className={navClass}>
              TIN TỨC<i className="bi bi-caret-down ms-2 icon-down"></i>
              <i className="bi bi-caret-up ms-2 icon-up"></i>
            </NavLink>
            <NavLink to="/ve-chung-toi" className={navClass}>
              VỀ SELENE<i className="bi bi-caret-down ms-2 icon-down"></i>
              <i className="bi bi-caret-up ms-2 icon-up"></i>
            </NavLink>
            <NavLink
              to="/khuyen-mai"
              className={({ isActive }) =>
                isActive
                  ? "rb-navlink rb-promo rb-active"
                  : "rb-navlink rb-promo"
              }
            >
              <i className="bi bi-gift-fill me-1" /> KHUYẾN MÃI
            </NavLink>
          </div>
        </div>

        {/* CỘT 3: ICONS */}
        <div className="rb-topicons">
          <div className="rb-icon-wrap">
            <div className="rb-icon-rel">
              <i className="bi bi-heart fs-5" />
              <span className="rb-bdot">{wl}</span>
            </div>
            <strong className="rb-ilabel mt-1">Yêu Thích</strong>
          </div>

          <div className="dropdown-center">
            <div
              className="rb-icon-wrap"
              role="button"
              data-bs-toggle="dropdown"
            >
              <div className="rb-icon-rel">
                <i className="bi bi-person fs-5" />
              </div>
              <strong className="rb-ilabel mt-1">Tài Khoản</strong>
            </div>

            <ul className="dropdown-menu dropdown-menu-end">
              {!isLogin ? (
                <>
                  <li>
                    <Link className="dropdown-item" to="/tai-khoan/dang-nhap">
                      <i className="bi bi-box-arrow-in-right me-1"></i> Đăng
                      nhập
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/tai-khoan/dang-ky">
                      <i className="bi bi-person-plus me-1"></i> Đăng ký
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link className="dropdown-item" to="/tai-khoan">
                      <i className="bi bi-person-bounding-box me-1"></i> Tài
                      khoản
                    </Link>
                  </li>
                  {admin && (
                    <>
                      <li>
                        <Link
                          className="dropdown-item"
                          to="/admin"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i className="bi bi-speedometer2 me-1"></i>
                          Trang quản trị
                        </Link>
                      </li>
                    </>
                  )}
                  <li>
                    <button className="dropdown-item" onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-1"></i> Đăng xuất
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>

          <Link
            to="/gio-hang"
            className="rb-icon-wrap text-decoration-none text-dark"
          >
            <div className="rb-icon-rel">
              <i className="bi bi-handbag fs-5" />
              <span className="rb-bdot">{cartCount}</span>
            </div>
            <strong className="rb-ilabel mt-1">Giỏ Hàng</strong>
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════
          MOBILE HEADER
      ══════════════════════════════════ */}
      <div className="rb-mobile-header">
        {/* TRÁI: hamburger + search */}
        <div className="rb-mob-left">
          <button
            className="rb-mob-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu"
          >
            <i className="bi bi-list" style={{ fontSize: 26 }} />
          </button>
          <button
            className="rb-mob-btn"
            onClick={() => setSearchOpen((s) => !s)}
            aria-label="Search"
          >
            <i className="bi bi-search" style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* GIỮA: Logo */}
        <div className="rb-mob-logo">
          <Link to="/">
            <img src={logo} alt="logo" height={48} />
          </Link>
        </div>

        {/* PHẢI: icons */}
        <div className="rb-mob-right">
          <div className="rb-mob-icon">
            <i className="bi bi-heart" />
            <span className="rb-mob-bdot">{wl}</span>
          </div>

          <div className="dropdown">
            <div
              className="rb-mob-icon"
              role="button"
              data-bs-toggle="dropdown"
            >
              <i className="bi bi-person" />
            </div>

            <ul className="dropdown-menu dropdown-menu-end">
              {!isLogin ? (
                <>
                  <li>
                    <Link className="dropdown-item" to="/tai-khoan/dang-nhap">
                      <i className="bi bi-box-arrow-in-right me-1"></i> Đăng
                      nhập
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/tai-khoan/dang-ky">
                      <i className="bi bi-person-plus me-1"></i> Đăng ký
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link className="dropdown-item" to="/tai-khoan">
                      <i className="bi bi-person-bounding-box me-1"></i> Tài
                      khoản
                    </Link>
                  </li>
                  {admin && (
                    <>
                      <li>
                        <Link
                          className="dropdown-item"
                          to="/admin"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i className="bi bi-speedometer2 me-1"></i>
                          Trang quản trị
                        </Link>
                      </li>
                    </>
                  )}
                  <li>
                    <button className="dropdown-item" onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-1"></i> Đăng xuất
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>

          <Link to="/gio-hang" className="rb-mob-icon text-decoration-none">
            <i className="bi bi-handbag" />
            <span className="rb-mob-bdot">{cartCount}</span>
          </Link>
        </div>
      </div>

      {/* Mobile search bar dropdown */}
      {searchOpen && (
        <div className="rb-mob-search-bar">
          <form className="input-group" onSubmit={handleProductSearch}>
            <input
              className="form-control"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm tên hoặc mã sản phẩm..."
              aria-label="Tìm tên hoặc mã sản phẩm"
              autoFocus
            />
            <button className="input-group-text" type="submit">
              <i className="bi bi-search" />
            </button>
          </form>
        </div>
      )}

      {/* Overlay */}
      <div
        className={`rb-mob-overlay${menuOpen ? " open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Drawer menu */}
      <div className={`rb-mob-drawer${menuOpen ? " open" : ""}`}>
        <div className="rb-mob-drawer-head">
          <img src={logo} alt="logo" />
          <button className="rb-mob-close" onClick={() => setMenuOpen(false)}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <ul className="rb-mob-menu-list">
          <li>
            <Link to="/" className="active">
              TRANG CHỦ
            </Link>
          </li>
          <li>
            <Link to="/san-pham">SẢN PHẨM</Link>
          </li>
          <li>
            <Link to="/">BỘ SƯU TẬP</Link>
          </li>
          <li>
            <Link to="/">TIN TỨC</Link>
          </li>
          <li>
            <Link to="/ve-chung-toi">VỀ SELENE</Link>
          </li>
          <li>
            <Link to="/" className="promo">
              <i className="bi bi-gift-fill me-2" />
              KHUYẾN MÃI
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}

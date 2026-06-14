// frontend\src\components\layout\Header.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.png";

export default function Header() {
  const [wl] = useState(0);
  const [ct] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isLogin] = useState(false); // TEST MẪU MỐT BỎ ĐỂ THAY BACKEND VÀO NHA

  // Tự động đóng search khi resize về desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1520) {
        setSearchOpen(false);
        setMenuOpen(false); // cũng đóng menu luôn cho sạch
      }
    };

    window.addEventListener("resize", handleResize);
    
    // Kiểm tra ngay khi component mount
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* ══════════════════════════════════
          DESKTOP HEADER
      ══════════════════════════════════ */}
      <div className="rb-desktop-header">

        {/* CỘT 1: LOGO */}
        <div className="rb-col-logo">
          <Link to="/"><img src={logo} alt="logo" width={165} height={75} /></Link>
        </div>

        {/* CỘT 2: TOPBAR + NAV */}
        <div className="rb-col-center">

          {/* HÀNG 1: HOTLINE + SEARCH */}
          <div className="rb-topbar">
            <div className="rb-topbar-left">
              <span className="me-5">
                <i className="bi bi-telephone-fill me-1" style={{ fontSize: "1.125em" }} /> HOTLINE:
                <a href="tel:0984624532" className="rb-navlnk ms-1">
                  <strong style={{ fontSize: "16px" }}>098 462 4532</strong>
                </a>
              </span>
              <span className="mx-5">
                <i className="bi bi-geo-alt-fill me-1" style={{ fontSize: "1.125em" }} />
                <Link to="/" className="rb-navlnk">HỆ THỐNG CỬA HÀNG</Link>
              </span>
            </div>

            <div className="rb-search mx-5">
              <div className="input-group">
                <input className="form-control" placeholder="Tìm sản phẩm..." />
                <button className="input-group-text">
                  <i className="bi bi-search" />
                </button>
              </div>
            </div>
          </div>

          {/* HÀNG 2: NAV LINKS */}
          <div className="rb-nav">
            <Link to="/" className="rb-navlink rb-active">TRANG CHỦ</Link>

            <Link to="/" className="rb-navlink">
              THỜI TRANG NỮ
              <i className="bi bi-chevron-down ms-1 icon-down"></i>
              <i className="bi bi-chevron-up ms-1 icon-up"></i>
            </Link>

            <Link to="/" className="rb-navlink">
              BỘ SƯU TẬP
              <i className="bi bi-chevron-down ms-1 icon-down"></i>
              <i className="bi bi-chevron-up ms-1 icon-up"></i>
            </Link>

            <Link to="/" className="rb-navlink">
              TIN TỨC THỜI TRANG
              <i className="bi bi-chevron-down ms-1 icon-down"></i>
              <i className="bi bi-chevron-up ms-1 icon-up"></i>
            </Link>

            <Link to="/" className="rb-navlink">
              TRỢ GIÚP
              <i className="bi bi-chevron-down ms-1 icon-down"></i>
              <i className="bi bi-chevron-up ms-1 icon-up"></i>
            </Link>

            <Link to="/" className="rb-navlink rb-promo">
              <i className="bi bi-gift-fill me-1" /> KHUYẾN MÃI
            </Link>
          </div>
        </div>

        {/* CỘT 3: ICONS */}
        <div className="rb-topicons">
          <div className="rb-icon-wrap">
            <div className="rb-icon-rel">
              <i className="bi bi-heart fs-5" />
              <span className="rb-bdot">{wl}</span>
            </div>
            <span className="rb-ilabel mt-1">Yêu Thích</span>
          </div>

          {/* <div className="rb-icon-wrap">
            <div className="rb-icon-rel">
              <i className="bi bi-person fs-5" />
            </div>
            <span className="rb-ilabel mt-1">Tài Khoản</span>
          </div> */}






          <div className="dropdown">

  <div
    className="rb-icon-wrap"
    role="button"
    data-bs-toggle="dropdown"
  >
    <div className="rb-icon-rel">
      <i className="bi bi-person fs-5" />
    </div>

    <span className="rb-ilabel mt-1">
      Tài Khoản
    </span>
  </div>

  <ul className="dropdown-menu dropdown-menu-end">

    {!isLogin ? (
      <>
        <li>
          <Link
            className="dropdown-item"
            to="/dang-nhap"
          >
            Đăng nhập
          </Link>
        </li>

        <li>
          <Link
            className="dropdown-item"
            to="/dang-ky"
          >
            Đăng ký
          </Link>
        </li>
      </>
    ) : (
      <>
        <li>
          <Link
            className="dropdown-item"
            to="/tai-khoan"
          >
            Tài khoản
          </Link>
        </li>

        <li>
          <button
            className="dropdown-item"
          >
            Đăng xuất
          </button>
        </li>
      </>
    )}

  </ul>

</div>




          <div className="rb-icon-wrap">
            <div className="rb-icon-rel">
              <i className="bi bi-handbag fs-5" />
              <span className="rb-bdot">{ct}</span>
            </div>
            <span className="rb-ilabel mt-1">Giỏ Hàng</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════
          MOBILE HEADER
      ══════════════════════════════════ */}
      <div className="rb-mobile-header">

        {/* TRÁI: hamburger + search */}
        <div className="rb-mob-left">
          <button className="rb-mob-btn" onClick={() => setMenuOpen(true)} aria-label="Menu">
            <i className="bi bi-list" style={{ fontSize: 26 }} />
          </button>
          <button className="rb-mob-btn" onClick={() => setSearchOpen(s => !s)} aria-label="Search">
            <i className="bi bi-search" style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* GIỮA: Logo */}
        <div className="rb-mob-logo">
          <Link to="/"><img src={logo} alt="logo" height={48} /></Link>
        </div>

        {/* PHẢI: icons */}
        <div className="rb-mob-right">
          <div className="rb-mob-icon">
            <i className="bi bi-heart" />
            <span className="rb-mob-bdot">{wl}</span>
          </div>
          <div className="rb-mob-icon">
            <i className="bi bi-person" />
          </div>
          <div className="rb-mob-icon">
            <i className="bi bi-handbag" />
            <span className="rb-mob-bdot">{ct}</span>
          </div>
        </div>
      </div>

      {/* Mobile search bar dropdown */}
      {searchOpen && (
        <div className="rb-mob-search-bar">
          <div className="input-group">
            <input className="form-control" placeholder="Tìm sản phẩm..." autoFocus />
            <button className="input-group-text">
              <i className="bi bi-search" />
            </button>
          </div>
        </div>
      )}

      {/* Overlay */}
      <div className={`rb-mob-overlay${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(false)} />

      {/* Drawer menu */}
      <div className={`rb-mob-drawer${menuOpen ? " open" : ""}`}>
        <div className="rb-mob-drawer-head">
          <img src={logo} alt="logo" />
          <button className="rb-mob-close" onClick={() => setMenuOpen(false)}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <ul className="rb-mob-menu-list">
          <li><Link to="/" className="active">TRANG CHỦ</Link></li>
          <li><Link to="/">THỜI TRANG NỮ</Link></li>
          <li><Link to="/">BỘ SƯU TẬP</Link></li>
          <li><Link to="/">TIN TỨC</Link></li>
          <li><Link to="/">TRỢ GIÚP</Link></li>
          <li><Link to="/" className="promo"><i className="bi bi-gift-fill me-2" />KHUYẾN MÃI</Link></li>
        </ul>
      </div>
    </>
  );
}
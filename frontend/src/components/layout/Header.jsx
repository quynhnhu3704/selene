// frontend\src\components\layout\Header.jsx
import { useState } from "react";
import logo from "../../assets/logo.png";

export default function Header() {
  const [wl] = useState(0);
  const [ct] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      {/* ══════════════════════════════════
          DESKTOP HEADER
      ══════════════════════════════════ */}
      <div className="rb-desktop-header">

        {/* CỘT 1: LOGO */}
        <div className="rb-col-logo">
          <a href="#">
            <img src={logo} alt="logo" width={165} height={75} />
          </a>
        </div>

        {/* CỘT 2: TOPBAR + NAV */}
        <div className="rb-col-center">

          {/* HÀNG 1: HOTLINE + SEARCH */}
          <div className="rb-topbar">
            <div className="rb-topbar-left">
              <span className="me-5">
                <i className="bi bi-telephone-fill me-1" /> HOTLINE:
                <a href="tel:0984624532" className="rb-navlnk ms-1">
                  <strong style={{ fontSize: "16px" }}>098 462 4532</strong>
                </a>
              </span>
              <span className="mx-5">
                <i className="bi bi-geo-alt-fill me-1" />
                <a href="#" className="rb-navlnk">HỆ THỐNG CỬA HÀNG</a>
              </span>
            </div>

            <div className="rb-search">
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
            <a href="#" className="rb-navlink rb-active">TRANG CHỦ</a>
            <a href="#" className="rb-navlink">
              THỜI TRANG NỮ
              <i className="bi bi-chevron-down ms-1 icon-down"></i>
              <i className="bi bi-chevron-up ms-1 icon-up"></i>
            </a>
            <a href="#" className="rb-navlink">
              BỘ SƯU TẬP
              <i className="bi bi-chevron-down ms-1 icon-down"></i>
              <i className="bi bi-chevron-up ms-1 icon-up"></i>
            </a>
            <a href="#" className="rb-navlink">
              TIN TỨC
              <i className="bi bi-chevron-down ms-1 icon-down"></i>
              <i className="bi bi-chevron-up ms-1 icon-up"></i>
            </a>
            <a href="#" className="rb-navlink">
              TRỢ GIÚP
              <i className="bi bi-chevron-down ms-1 icon-down"></i>
              <i className="bi bi-chevron-up ms-1 icon-up"></i>
            </a>
            <a href="#" className="rb-navlink rb-promo">
              <i className="bi bi-gift-fill me-1" /> KHUYẾN MÃI
            </a>
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
          <div className="rb-icon-wrap">
            <div className="rb-icon-rel">
              <i className="bi bi-person fs-5" />
            </div>
            <span className="rb-ilabel mt-1">Tài Khoản</span>
          </div>
          <div className="rb-icon-wrap">
            <div className="rb-icon-rel">
              <i className="bi bi-cart3 fs-5" />
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
          <a href="#">
            <img src={logo} alt="logo" height={48} />
          </a>
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
            <i className="bi bi-bag" />
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
          <li><a href="#" className="active">TRANG CHỦ</a></li>
          <li><a href="#">THỜI TRANG NỮ</a></li>
          <li><a href="#">BỘ SƯU TẬP</a></li>
          <li><a href="#">TIN TỨC</a></li>
          <li><a href="#">TRỢ GIÚP</a></li>
          <li><a href="#" className="promo"><i className="bi bi-gift-fill me-2" />KHUYẾN MÃI</a></li>
        </ul>
      </div>
    </>
  );
}
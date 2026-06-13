// frontend\src\components\layout\Header.jsx
import { useState } from "react";
import logo from "../../assets/logo.png";

export default function Header() {
  const [wl] = useState(0);
  const [ct] = useState(0);

  return (
    <>
      <div id="rubies-root" style={{ padding: "0 70px 0 25px" }}>

        <div className="row align-items-center">

          {/* ═══ TOP BAR ═══ */}
          {/* CỘT 1: LOGO (nhỏ) */}
          <div className="col-12 col-lg-2 d-flex flex-column justify-content-center align-items-center">
            <a href="#">
              <img src={logo} alt="logo" width={165} height={75}/>
            </a>
          </div>

          {/* CỘT 2: LỚN NHẤT */}
          <div className="col-12 col-lg-8 d-flex flex-column justify-content-center">

            {/* HÀNG 1: HOTLINE + SEARCH */}
            <div className="rb-topbar row align-items-center w-100 flex-wrap">
              <div className="col-12 col-md-6 text-center text-md-start">
                <span className="me-5">
                  <i className="bi bi-telephone-fill me-1" /> HOTLINE:
                  <a href="tel:0984624532" className="rb-navlnk ms-1"><strong style={{ fontSize: "16px" }}>098 462 4532</strong></a>
                </span>

                <span className="ms-1">
                  <i className="bi bi-geo-alt-fill me-1" /> <a href="#" className="rb-navlnk">HỆ THỐNG CỬA HÀNG</a>
                </span>
              </div>

              <div className="rb-search col-12 col-md-6 d-flex justify-content-md-end justify-content-center">
                <div className="input-group">
                  <input className="form-control" placeholder="Tìm sản phẩm..." />
                  <button className="input-group-text">
                    <i className="bi bi-search" />
                  </button>
                </div>
              </div>
            </div>

            {/* HÀNG 2: MENU */}
            <div className="rb-nav row w-100 flex-nowrap">
              <div className="col-12 d-flex">
                <a href="#" className="rb-navlink rb-active">TRANG CHỦ</a>
                
                {/* DROPDOWN */}
                {/* <div className="dropdown"> */}
                  {/* <a href="#" className="rb-navlink dropdown-toggle" data-bs-toggle="dropdown"> */}
                  <a href="#" className="rb-navlink">
                    THỜI TRANG NỮ 
                    <i className="bi bi-chevron-down ms-1 icon-down"></i>
                    <i className="bi bi-chevron-up ms-1 icon-up"></i>
                  </a>
                  
                  {/* <ul className="dropdown-menu dropdown-menu-end shadow">
                    <li><a className="dropdown-item" href="#">Áo</a></li>
                    <li><a className="dropdown-item" href="#">Quần</a></li>
                    <li><a className="dropdown-item" href="#">Váy</a></li>
                  </ul> */}
                {/* </div> */}

                <a href="#" className="rb-navlink">BỘ SƯU TẬP 
                  <i className="bi bi-chevron-down ms-1 icon-down"></i>
                  <i className="bi bi-chevron-up ms-1 icon-up"></i>
                </a>
                <a href="#" className="rb-navlink">TIN TỨC 
                  <i className="bi bi-chevron-down ms-1 icon-down"></i>
                  <i className="bi bi-chevron-up ms-1 icon-up"></i>
                </a>
                <a href="#" className="rb-navlink">TRỢ GIÚP 
                  <i className="bi bi-chevron-down ms-1 icon-down"></i>
                  <i className="bi bi-chevron-up ms-1 icon-up"></i>
                </a>
                <a href="#" className="rb-navlink rb-promo"><i className="bi bi-gift-fill me-1" /> KHUYẾN MÃI</a>
              </div>
            </div>
          </div>

          {/* CỘT 3: ICON */}
          <div className="rb-topicons col-12 col-lg-2 text-end">
            <div className="rb-icon-wrap">
              <div className="rb-icon-rel"><i className="bi bi-heart fs-5" /><span className="rb-bdot">{wl}</span></div>
              <span className="rb-ilabel mt-1">Yêu Thích</span>
            </div>

            <div className="rb-icon-wrap">
              <div className="rb-icon-rel"><i className="bi bi-person fs-5" /></div>
              <span className="rb-ilabel mt-1">Tài Khoản</span>
            </div>
            <div className="rb-icon-wrap">
              <div className="rb-icon-rel"><i className="bi bi-cart3 fs-5" /><span className="rb-bdot">{ct}</span></div>
              <span className="rb-ilabel mt-1">Giỏ Hàng</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
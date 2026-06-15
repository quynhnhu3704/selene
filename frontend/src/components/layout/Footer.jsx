// frontend\src\components\layout\Footer.jsx
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="rb-footer">
      <div className="row g-4 pb-2 mx-5">
        <div className="col-12 col-lg-4">
          <h5>SELENE STUDIO</h5>
          <address className="mb-1">54 Trần Quang Diệu, Phường Nhiêu Lộc, TP. HCM</address>
          <p><strong>Điện thoại:</strong> <a href="tel:0984624532" className="rb-footer-link fw-bold">098 462 4532</a></p>
          <p><strong>Email:</strong> <a href="mailto:selenein2026@gmail.com" className="rb-footer-link fw-bold">selenein2026@gmail.com</a></p>
          <div className="rb-fsocial">
            <div className="rb-sbtnf"><a href="https://www.facebook.com"><i className="bi bi-facebook" /></a></div>
            <div className="rb-sbtnf"><a href="https://www.instagram.com"><i className="bi bi-instagram" /></a></div>
            <div className="rb-sbtnf"><a href="https://www.youtube.com"><i className="bi bi-youtube" /></a></div>
            <div className="rb-sbtnf"><a href="https://www.tiktok.com"><i className="bi bi-tiktok" /></a></div>
          </div>
        </div>
        <div className="col-12 col-lg-2">
          <h5>CÔNG TY</h5>
          <ul>
            <li><Link to="/" className="rb-footer-link">SELENE STUDIO</Link></li>
            <li><Link to="/" className="rb-footer-link">Tuyển Dụng &amp; Việc Làm</Link></li>
            <li><Link to="/" className="rb-footer-link">Tin Tức Thời Trang</Link></li>
            <li><Link to="/" className="rb-footer-link">Chăm Sóc Khách Hàng</Link></li>
          </ul>
        </div>
        <div className="col-12 col-lg-3">
          <h5>CHÍNH SÁCH KHÁCH HÀNG</h5>
          <ul>
            <li><Link to="/" className="rb-footer-link">Chính Sách KH Thân Thiết</Link></li>
            <li><Link to="/" className="rb-footer-link">Chính Sách Đổi và Trả Hàng</Link></li>
            <li><Link to="/" className="rb-footer-link">Chính Sách Bảo Hành</Link></li>
            <li><Link to="/" className="rb-footer-link">Chính Sách Bảo Mật</Link></li>
            <li><Link to="/" className="rb-footer-link">Hướng Dẫn Sử Dụng</Link></li>
            <li><Link to="/" className="rb-footer-link">Các Câu Hỏi Thường Gặp</Link></li>
          </ul>
        </div>
        <div className="col-12 col-lg-3">
          <h5>THÔNG TIN CỬA HÀNG</h5>
          <p className="rb-fstore-n">CỬA HÀNG SỐ 1</p>
          <p>26 Lý Tự Trọng, Phường Sài Gòn,</p>
          <p>Ho Chi Minh City</p>
          <p><span className="rb-fstore-l"><Link to="/" className="rb-footer-link">Xem tất cả cửa hàng</Link></span></p>
        </div>
      </div>
      <div className="mx-5 px-2"><hr style={{ margin: 0 }} /></div>
      <div className="rb-fbottom mx-5" style={{ padding: "10px 0" }}>© Bản quyền thuộc về <strong>Selene Studio</strong> | Cung cấp bởi <strong>Selene</strong></div>
    </footer>
  )
}
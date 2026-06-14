// frontend\src\components\layout\Footer.jsx
export default function Footer() {
  return (
    <footer className="rb-footer">
      <div className="row g-4 pb-2 mx-5">
        <div className="col-12 col-lg-4">
          <h5>SELENE STUDIO</h5>
          <address className="mb-1">54 Trần Quang Diệu, Phường Nhiêu Lộc, TP. HCM</address>
          <p><strong>Điện thoại:</strong> <a href="tel:0984624532" className="rb-flink fw-bold">098 462 4532</a></p>
          <p><strong>Email:</strong> <a href="mailto:selenein2026@gmail.com" className="rb-flink fw-bold">selenein2026@gmail.com</a></p>
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
            <li><a href="#" className="rb-flink">SELENE STUDIO</a></li>
            <li><a href="#" className="rb-flink">Tuyển Dụng &amp; Việc Làm</a></li>
            <li><a href="#" className="rb-flink">Tin Tức Thời Trang</a></li>
            <li><a href="#" className="rb-flink">Chăm Sóc Khách Hàng</a></li>
          </ul>
        </div>
        <div className="col-12 col-lg-3">
          <h5>CHÍNH SÁCH KHÁCH HÀNG</h5>
          <ul>
            <li><a href="#" className="rb-flink">Chính Sách KH Thân Thiết</a></li>
            <li><a href="#" className="rb-flink">Chính Sách Đổi và Trả Hàng</a></li>
            <li><a href="#" className="rb-flink">Chính Sách Bảo Hành</a></li>
            <li><a href="#" className="rb-flink">Chính Sách Bảo Mật</a></li>
            <li><a href="#" className="rb-flink">Hướng Dẫn Sử Dụng</a></li>
            <li><a href="#" className="rb-flink">Các Câu Hỏi Thường Gặp</a></li>
          </ul>
        </div>
        <div className="col-12 col-lg-3">
          <h5>THÔNG TIN CỬA HÀNG</h5>
          <p className="rb-fstore-n">CỬA HÀNG SỐ 1</p>
          <p>26 Lý Tự Trọng, Phường Sài Gòn,</p>
          <p>Ho Chi Minh City</p>
          <p><span className="rb-fstore-l"><a href="#" className="rb-flink">Xem tất cả cửa hàng</a></span></p>
        </div>
      </div>
      <p className="mx-5 px-2"><hr style={{ margin: 0 }} /></p>
      <div className="rb-fbottom mx-5" style={{ padding: "10px 0" }}>© Bản quyền thuộc về Selene Studio | Cung cấp bởi Selene</div>
    </footer>
  )
}
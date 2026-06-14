// frontend\src\components\layout\Footer.jsx
export default function Footer() {
  return (
    <footer className="rb-footer">
      <div className="row g-4 pb-2">
        <div className="col-12 col-lg-4">
          <h5>RUBIES STUDIO</h5>
          <address>47 - 49 Trần Quang Diệu, Phường 14, Quận 3, TP. HCM</address>
          <p style={{marginTop:8}}><strong style={{color:"#fff"}}>Điện thoại:</strong> 070 347 0938</p>
          <p><strong style={{color:"#fff"}}>Email:</strong> rubiesin2015@gmail.com</p>
          <div className="rb-fsocial">
            <div className="rb-sbtnf"><i className="bi bi-facebook" /></div>
            <div className="rb-sbtnf"><i className="bi bi-instagram" /></div>
            <div className="rb-sbtnf"><i className="bi bi-youtube" /></div>
            <div className="rb-sbtnf"><i className="bi bi-tiktok" /></div>
          </div>
        </div>
        <div className="col-12 col-lg-2">
          <h5>CÔNG TY</h5>
          <ul>
            <li>RUBIES RUBIES</li>
            <li>Tuyển Dụng &amp; Việc Làm</li>
            <li>Tin Tức Thời Trang</li>
            <li>Chăm Sóc Khách Hàng</li>
          </ul>
        </div>
        <div className="col-12 col-lg-3">
          <h5>CHÍNH SÁCH KHÁCH HÀNG</h5>
          <ul>
            <li>Chính Sách KH Thân Thiết</li>
            <li>Chính Sách Đổi và Trả Hàng</li>
            <li>Chính Sách Bảo Hành</li>
            <li>Chính Sách Bảo Mật</li>
            <li>Hướng Dẫn Sử Dụng</li>
            <li>Các Câu Hỏi Thường Gặp</li>
          </ul>
        </div>
        <div className="col-12 col-lg-3">
          <h5>THÔNG TIN CỬA HÀNG</h5>
          <p className="rb-fstore-n">CỬA HÀNG SỐ 1</p>
          <p>26 Lý Tự Trọng, Phường Bến Nghé, Quận 1,<br/>Ho Chi Minh City</p>
          <p style={{marginTop:6}}><span className="rb-fstore-l">Xem tất cả cửa hàng</span></p>
        </div>
      </div>
      <div className="rb-fbottom">
        © Bản quyền thuộc về Rubies Rubies | Cung cấp bởi Sapo
      </div>
    </footer>
  )
}
// frontend\src\pages\About\index.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", content: "" });
  const [sent, setSent] = useState(false);
  const address = "54 Trần Quang Diệu, Phường Nhiêu Lộc, TP. HCM";
  const mapQuery = encodeURIComponent(address);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSent(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Lời nhắn gửi SELENE STUDIO từ ${form.name.trim()}`);
    const body = encodeURIComponent(
      `Họ và tên: ${form.name.trim()}\nEmail: ${form.email.trim()}\nĐiện thoại: ${form.phone.trim()}\n\n${form.content.trim()}`,
    );
    window.location.href = `mailto:selenein2026@gmail.com?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <>
      <Helmet>
        <title>Về chúng tôi | Selene</title>
        <meta name="description" content={`Kết nối với SELENE STUDIO tại ${address}. Điện thoại: 098 462 4532. Email: selenein2026@gmail.com.`} />
      </Helmet>
      <style>{`
        /* ── BREADCRUMB ── */
        .ct-breadcrumb-wrap { padding: 0 75px; border-bottom: 1px solid #f0f0f0; }
        .ct-breadcrumb-wrap > .container { width: 100%; max-width: none; margin: 0 !important; }
        .ct-page { padding: 32px 75px 72px; background: #fff; color: #212529; }

        /* ── GIỚI THIỆU SELENE ── */
        .ct-intro { display: flex; align-items: center; justify-content: space-between; gap: 32px; padding: 36px 40px; margin-bottom: 36px; border: 1px solid #efdddd; border-radius: 12px; background: #fcf6f6; }
        .ct-eyebrow { color: #871b1b; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
        .ct-title { color: #871b1b; font-size: clamp(28px, 3vw, 42px); font-weight: 800; letter-spacing: 1px; margin-bottom: 14px; }
        .ct-intro-text { max-width: 600px; color: #616168; font-size: 15px; line-height: 1.8; margin: 0; }
        .ct-intro-link { display: inline-flex; align-items: center; justify-content: center; gap: 12px; flex-shrink: 0; padding: 12px 20px; }

        /* ── THÔNG TIN LIÊN HỆ ── */
        .ct-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 40px; align-items: start; }
        .ct-heading { font-size: 21px; font-weight: 700; margin-bottom: 10px; }
        .ct-description { color: #6c757d; font-size: 14px; line-height: 1.7; margin-bottom: 24px; }
        .ct-info { display: flex; flex-direction: column; gap: 18px; padding-bottom: 26px; margin-bottom: 26px; border-bottom: 1px solid #eee; }
        .ct-info-item { display: flex; align-items: flex-start; gap: 14px; }
        .ct-info-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 40px; height: 40px; background: #fcf2f2; color: #871b1b; border-radius: 50%; font-size: 18px; }
        .ct-info-item > div { min-width: 0; }
        .ct-info-item strong { display: block; font-size: 13px; font-weight: 600; color: #6c757d; margin-bottom: 4px; }
        .ct-info-item p, .ct-info-item a { margin: 0; font-size: 14px; line-height: 1.7; overflow-wrap: anywhere; }
        .ct-info-item a { color: #212529; text-decoration: none; }
        .ct-info-item a:hover { color: #871b1b; text-decoration: underline; }

        /* ── FORM ── */
        .ct-form { display: flex; flex-direction: column; gap: 18px; }
        .ct-form-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .ct-form .form-label { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
        .ct-form .form-control { padding: 12px 14px; font-family: inherit; border-radius: 6px; }
        .ct-form textarea { min-height: 140px; resize: vertical; }
        .ct-form .ct-btn-submit { align-self: flex-start; display: inline-flex; align-items: center; gap: 10px; margin: 0; padding: 12px 24px; }
        .ct-note { font-size: 13px; color: #6c757d; line-height: 1.7; margin: 0; }
        .ct-toast { padding: 14px 16px; background: #fcf6f6; border: 1px solid #efdddd; border-radius: 6px; font-size: 14px; line-height: 1.7; color: #871b1b; }

        /* ── BẢN ĐỒ ── */
        .ct-right { overflow: hidden; border: 1px solid #e9e2e2; border-radius: 12px; }
        .ct-map-header { padding: 24px; }
        .ct-map-header .ct-description { margin-bottom: 0; }
        .ct-map-wrap { background: #f5f5f5; }
        .ct-map-wrap iframe { width: 100%; height: 420px; border: none; display: block; }
        .ct-map-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 24px; background: #fcf6f6; }
        .ct-map-footer p { margin: 0; color: #6c757d; font-size: 13px; line-height: 1.7; }
        .ct-map-footer strong { display: block; color: #871b1b; font-size: 14px; }
        .ct-map-footer .btn { flex-shrink: 0; font-size: 14px; padding: 10px 16px; }
        .ct-page a:focus-visible { outline: 3px solid #871b1b; outline-offset: 4px; }

        /* ── RESPONSIVE ── */
        @media (max-width: 1520px) {
          .ct-breadcrumb-wrap { padding: 0 24px; }
          .ct-page { padding: 28px 24px 56px; }
        }
        @media (max-width: 900px) {
          .ct-intro { align-items: flex-start; flex-direction: column; padding: 28px; }
          .ct-layout { grid-template-columns: minmax(0, 1fr); gap: 32px; }
          .ct-map-wrap iframe { height: 360px; }
        }
        @media (max-width: 560px) {
          .ct-breadcrumb-wrap { padding: 0 16px; }
          .ct-page { padding: 24px 16px 40px; }
          .ct-intro { padding: 24px 20px; gap: 24px; }
          .ct-form-row { grid-template-columns: minmax(0, 1fr); }
          .ct-form .ct-btn-submit { width: 100%; justify-content: center; }
          .ct-map-header, .ct-map-footer { padding: 20px; }
          .ct-map-footer { flex-wrap: wrap; }
          .ct-map-wrap iframe { height: 280px; }
        }
      `}</style>

      <div className="ct-breadcrumb-wrap">
        <Breadcrumb items={[{ label: "Trang chủ", path: "/" }, { label: "Về chúng tôi" }]} />
      </div>

      <div className="ct-page">
        {/* ── GIỚI THIỆU ── */}
        <section className="ct-intro" aria-labelledby="ct-title">
          <div>
            <p className="ct-eyebrow">Về chúng tôi</p>
            <h1 className="ct-title" id="ct-title">SELENE STUDIO</h1>
            <p className="ct-intro-text">
              Một chút cảm hứng, một nét riêng của bạn. Cùng Selene khám phá
              những thiết kế để tự tin thể hiện phong cách mỗi ngày.
            </p>
          </div>
          <Link to="/san-pham" className="ct-intro-link btn btn-outline-dark fw-semibold">
            Khám phá Selene <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </section>

        <div className="ct-layout">
          {/* ── THÔNG TIN + FORM ── */}
          <section aria-labelledby="ct-contact-title">
            <h2 className="ct-heading" id="ct-contact-title">Kết nối với Selene</h2>
            <p className="ct-description">Selene luôn sẵn lòng lắng nghe câu chuyện và những lời nhắn từ bạn.</p>
            <div className="ct-info">
              <div className="ct-info-item">
                <span className="ct-info-icon"><i className="bi bi-geo-alt" aria-hidden="true" /></span>
                <div><strong>Địa chỉ studio</strong><p>{address}</p></div>
              </div>
              <div className="ct-info-item">
                <span className="ct-info-icon"><i className="bi bi-telephone" aria-hidden="true" /></span>
                <div><strong>Điện thoại</strong><a href="tel:0984624532">098 462 4532</a></div>
              </div>
              <div className="ct-info-item">
                <span className="ct-info-icon"><i className="bi bi-envelope" aria-hidden="true" /></span>
                <div><strong>Email</strong><a href="mailto:selenein2026@gmail.com">selenein2026@gmail.com</a></div>
              </div>
            </div>

            <form className="ct-form" onSubmit={handleSubmit}>
              <div className="ct-form-row">
                <div>
                  <label className="form-label" htmlFor="ct-name">Họ và tên <span className="text-danger">*</span></label>
                  <input id="ct-name" className="form-control" type="text" name="name" placeholder="Nhập họ và tên" autoComplete="name" maxLength={100} required value={form.name} onChange={handleChange} />
                </div>
                <div>
                  <label className="form-label" htmlFor="ct-email">Email <span className="text-danger">*</span></label>
                  <input id="ct-email" className="form-control" type="email" name="email" placeholder="Nhập địa chỉ email" autoComplete="email" maxLength={100} required value={form.email} onChange={handleChange} />
                </div>
              </div>
              <div>
                <label className="form-label" htmlFor="ct-phone">Điện thoại <span className="text-muted fw-normal">(không bắt buộc)</span></label>
                <input id="ct-phone" className="form-control" type="tel" name="phone" placeholder="Nhập số điện thoại" autoComplete="tel" maxLength={20} value={form.phone} onChange={handleChange} />
              </div>
              <div>
                <label className="form-label" htmlFor="ct-content">Lời nhắn của bạn <span className="text-danger">*</span></label>
                <textarea id="ct-content" className="form-control" name="content" placeholder="Bạn muốn chia sẻ điều gì với Selene?" rows={5} maxLength={2000} required value={form.content} onChange={handleChange} />
              </div>
              <p className="ct-note" id="ct-email-note">Biểu mẫu sẽ mở ứng dụng email với lời nhắn soạn sẵn. Bạn vui lòng nhấn gửi trong ứng dụng email để liên hệ Selene.</p>
              <button type="submit" className="ct-btn-submit form-btn btn btn-dark fw-semibold" aria-describedby="ct-email-note">
                Soạn email gửi Selene <i className="bi bi-arrow-up-right" aria-hidden="true" />
              </button>
              {sent && (
                <div className="ct-toast" role="status">
                  Lời nhắn đã sẵn sàng. Nếu ứng dụng email chưa mở, bạn có thể gửi trực tiếp đến selenein2026@gmail.com hoặc gọi 098 462 4532.
                </div>
              )}
            </form>
          </section>

          {/* ── GOOGLE MAP ── */}
          <section className="ct-right" aria-labelledby="ct-map-title">
            <div className="ct-map-header">
              <p className="ct-eyebrow">Ghé thăm chúng mình</p>
              <h2 className="ct-heading" id="ct-map-title">Hẹn bạn tại Selene</h2>
              <p className="ct-description">{address}</p>
            </div>
            <div className="ct-map-wrap">
              <iframe title="SELENE STUDIO - Bản đồ 54 Trần Quang Diệu" src={`https://www.google.com/maps?q=${mapQuery}&output=embed`} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
            <div className="ct-map-footer">
              <p><strong>SELENE STUDIO</strong>Một điểm hẹn cho phong cách của bạn.</p>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline-dark fw-semibold">
                <i className="bi bi-sign-turn-right me-2" aria-hidden="true" />Chỉ đường
              </a>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

// frontend\src\pages\Contact.jsx
import { useState } from "react";
import { Link } from "react-router-dom";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", content: "" });
  const [sent, setSent] = useState(false);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: gọi API gửi form
    console.log(form);
    setSent(true);
    setTimeout(() => setSent(false), 3500);
  };

  return (
    <>
      <style>{`
        /* ── BREADCRUMB WRAP ── */
        .ct-breadcrumb-wrap {
          padding: 13px 75px;
          background: #fff;
          border-bottom: 1px solid #f0f0f0;
        }

        /* ── PAGE WRAPPER ── */
        .ct-page {
          padding: 48px 75px 72px;
          background: #fff;
          min-height: 80vh;
        }

        /* ── LAYOUT: FORM trái + MAP phải ── */
        .ct-layout {
          display: flex;
          align-items: flex-start;
          gap: 48px;
        }

        /* ── LEFT: thông tin + form ── */
        .ct-left {
          flex: 0 0 46%;
          max-width: 46%;
        }

        .ct-heading {
          font-size: 17px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #111;
          margin-bottom: 20px;
        }

        /* thông tin liên hệ */
        .ct-info { margin-bottom: 28px; }
        .ct-info p {
          font-size: 14.5px;
          color: #222;
          margin-bottom: 8px;
          line-height: 1.6;
        }
        .ct-info strong { font-weight: 700; color: #111; }
        .ct-info a { color: #871B1B; text-decoration: none; font-weight: 600; }
        .ct-info a:hover { text-decoration: underline; }

        /* ── FORM ── */
        .ct-form { display: flex; flex-direction: column; gap: 14px; }

        /* hàng ngang: họ tên + email */
        .ct-form-row {
          display: flex;
          gap: 14px;
        }
        .ct-form-row .ct-input { flex: 1; }

        /* input chung */
        .ct-input {
          width: 100%;
          border: 1.5px solid #d8d8d8;
          border-radius: 6px;
          padding: 13px 15px;
          font-size: 14px;
          font-family: 'Montserrat', sans-serif;
          color: #333;
          outline: none;
          background: #fff;
          transition: border-color 0.2s;
          resize: none;
        }
        .ct-input::placeholder { color: #bbb; }
        .ct-input:focus { border-color: #871B1B; }

        textarea.ct-input {
          height: 150px;
          resize: vertical;
        }

        /* nút gửi */
        .ct-btn-submit {
          align-self: flex-start;
          padding: 13px 36px;
          background: #111;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Montserrat', sans-serif;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          letter-spacing: 0.4px;
          transition: background 0.18s, transform 0.1s;
          margin-top: 4px;
        }
        .ct-btn-submit:hover { background: #871B1B; }
        .ct-btn-submit:active { transform: scale(0.97); }

        /* toast success */
        .ct-toast {
          margin-top: 12px;
          padding: 10px 16px;
          background: #e8f5e9;
          border: 1px solid #a5d6a7;
          border-radius: 6px;
          font-size: 13.5px;
          color: #2e7d32;
          font-weight: 600;
        }

        /* ── RIGHT: MAP ── */
        .ct-right {
          flex: 1 1 0;
          min-width: 0;
        }

        .ct-map-wrap {
          width: 100%;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e0e0e0;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          line-height: 0;
        }

        .ct-map-wrap iframe {
          width: 100%;
          height: 520px;
          border: none;
          display: block;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 1520px) {
          .ct-breadcrumb-wrap { padding: 13px 24px; }
          .ct-page { padding: 36px 24px 56px; }
        }
        @media (max-width: 900px) {
          .ct-layout { flex-direction: column; gap: 32px; }
          .ct-left { flex: unset; max-width: 100%; width: 100%; }
          .ct-right { width: 100%; }
          .ct-map-wrap iframe { height: 360px; }
        }
        @media (max-width: 560px) {
          .ct-form-row { flex-direction: column; gap: 14px; }
          .ct-map-wrap iframe { height: 280px; }
        }
      `}</style>

      {/* ── BREADCRUMB ── */}
      <div className="ct-breadcrumb-wrap">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <Link to="/">Trang chủ</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Về chúng tôi
            </li>
          </ol>
        </nav>
      </div>

      {/* ── TRANG NỘI DUNG ── */}
      <div className="ct-page">
        <div className="ct-layout">

          {/* ═══ CỘT TRÁI: thông tin + form ═══ */}
          <div className="ct-left">

            <h1 className="ct-heading">Ý kiến của bạn về Rubies</h1>

            <div className="ct-info">
              <p>
                <strong>Địa chỉ:</strong>&nbsp;
                47 - 49 Trần Quang Diệu, Phường 14, Quận 3, TP. HCM
              </p>
              <p>
                <strong>Hotline:</strong>&nbsp;
                <a href="tel:0703470938">070 347 0938</a>
              </p>
              <p>
                <strong>Email:</strong>&nbsp;
                <a href="mailto:rubiesin2015@gmail.com">rubiesin2015@gmail.com</a>
              </p>
            </div>

            <form className="ct-form" onSubmit={handleSubmit} noValidate>

              {/* Họ và tên + Email */}
              <div className="ct-form-row">
                <input
                  className="ct-input"
                  type="text"
                  name="name"
                  placeholder="Họ và tên"
                  value={form.name}
                  onChange={handleChange}
                />
                <input
                  className="ct-input"
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              {/* Điện thoại */}
              <input
                className="ct-input"
                type="tel"
                name="phone"
                placeholder="Điện thoại"
                value={form.phone}
                onChange={handleChange}
              />

              {/* Nội dung */}
              <textarea
                className="ct-input"
                name="content"
                placeholder="Nội dung"
                value={form.content}
                onChange={handleChange}
              />

              <button type="submit" className="ct-btn-submit">
                Gửi thông tin
              </button>

              {sent && (
                <div className="ct-toast">
                  ✓ Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất có thể.
                </div>
              )}

            </form>
          </div>

          {/* ═══ CỘT PHẢI: Google Map ═══ */}
          <div className="ct-right">
            <div className="ct-map-wrap">
              <iframe
                title="Rubies Studio - Bản đồ"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.5177580073!2d106.6827!3d10.7763!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f1b7c3a1d3b%3A0x0!2s47+Tr%E1%BA%A7n+Quang+Di%E1%BB%87u%2C+Ph%C6%B0%E1%BB%9Dng+14%2C+Qu%E1%BA%ADn+3%2C+Th%C3%A0nh+ph%E1%BB%91+H%E1%BB%93+Ch%C3%AD+Minh!5e0!3m2!1svi!2s!4v1700000000000"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
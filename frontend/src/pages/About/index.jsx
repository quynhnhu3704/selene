// frontend\src\pages\About\index.jsx
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    content: "",
  });
  const [sent, setSent] = useState(false);
  const address = "48 Trần Quang Diệu, Phường Nhiêu Lộc, TP. HCM";
  const mapQuery = encodeURIComponent(address);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSent(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(
      `Lời nhắn gửi SELENE STUDIO từ ${form.name.trim()}`,
    );
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
        <meta
          name="description"
          content={`Kết nối với SELENE STUDIO tại ${address}. Điện thoại: 098 462 4532. Email: selenein2026@gmail.com.`}
        />
      </Helmet>

      <div className="ct-breadcrumb-wrap">
        <Breadcrumb
          items={[{ label: "Trang chủ", path: "/" }, { label: "Về chúng tôi" }]}
        />
      </div>

      <div className="ct-page">
        <div className="ct-layout">
          {/* ── THÔNG TIN + FORM ── */}
          <section aria-labelledby="ct-contact-title">
            <h1 className="adm-page-title" id="ct-contact-title">
              Kết nối với Selene
            </h1>
            <p className="ct-description">
              Selene luôn sẵn lòng lắng nghe câu chuyện và những lời nhắn từ
              bạn.
            </p>
            <div className="ct-info">
              <div className="ct-info-item">
                <span className="ct-info-icon">
                  <i className="bi bi-geo-alt" aria-hidden="true" />
                </span>
                <div>
                  <strong>Địa chỉ studio</strong>
                  <p>{address}</p>
                </div>
              </div>
              <div className="ct-info-item">
                <span className="ct-info-icon">
                  <i className="bi bi-telephone" aria-hidden="true" />
                </span>
                <div>
                  <strong>Điện thoại</strong>
                  <a href="tel:0984624532">098 462 4532</a>
                </div>
              </div>
              <div className="ct-info-item">
                <span className="ct-info-icon">
                  <i className="bi bi-envelope" aria-hidden="true" />
                </span>
                <div>
                  <strong>Email</strong>
                  <a href="mailto:selenein2026@gmail.com">
                    selenein2026@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <form className="ct-form" onSubmit={handleSubmit}>
              <div className="ct-form-row">
                <div>
                  <label className="form-label" htmlFor="ct-name">
                    Họ và tên <span className="text-danger">*</span>
                  </label>
                  <input
                    id="ct-name"
                    className="form-control"
                    type="text"
                    name="name"
                    placeholder="Nhập họ và tên"
                    autoComplete="name"
                    maxLength={100}
                    required
                    value={form.name}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="ct-email">
                    Email <span className="text-danger">*</span>
                  </label>
                  <input
                    id="ct-email"
                    className="form-control"
                    type="email"
                    name="email"
                    placeholder="Nhập địa chỉ email"
                    autoComplete="email"
                    maxLength={100}
                    required
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div>
                <label className="form-label" htmlFor="ct-phone">
                  Điện thoại{" "}
                  <span className="text-muted fw-normal">(không bắt buộc)</span>
                </label>
                <input
                  id="ct-phone"
                  className="form-control"
                  type="tel"
                  name="phone"
                  placeholder="Nhập số điện thoại"
                  autoComplete="tel"
                  maxLength={20}
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="ct-content">
                  Lời nhắn của bạn <span className="text-danger">*</span>
                </label>
                <textarea
                  id="ct-content"
                  className="form-control"
                  name="content"
                  placeholder="Bạn muốn chia sẻ điều gì với Selene?"
                  rows={5}
                  maxLength={2000}
                  required
                  value={form.content}
                  onChange={handleChange}
                />
              </div>
              <p className="ct-note" id="ct-email-note">
                Biểu mẫu sẽ mở ứng dụng email với lời nhắn soạn sẵn. Bạn vui
                lòng nhấn gửi trong ứng dụng email để liên hệ Selene.
              </p>
              <button
                type="submit"
                className="ct-btn-submit form-btn btn btn-dark fw-semibold px-4"
                aria-describedby="ct-email-note"
              >
                Soạn email gửi Selene{" "}
                <i className="bi bi-arrow-up-right" aria-hidden="true" />
              </button>
              {sent && (
                <div className="ct-toast" role="status">
                  Lời nhắn đã sẵn sàng. Nếu ứng dụng email chưa mở, bạn có thể
                  gửi trực tiếp đến selenein2026@gmail.com hoặc gọi 098 462
                  4532.
                </div>
              )}
            </form>
          </section>

          {/* ── GOOGLE MAP ── */}
          <section className="ct-right" aria-labelledby="ct-map-title">
            <div className="ct-map-header">
              <p className="ct-eyebrow">Ghé thăm chúng mình</p>
              <h2 className="adm-page-title" id="ct-map-title">
                Hẹn bạn tại Selene
              </h2>
              <p className="ct-description">{address}</p>
            </div>
            <div className="ct-map-wrap">
              <iframe
                title="SELENE STUDIO - Bản đồ 54 Trần Quang Diệu"
                src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="ct-map-footer">
              <p>
                <strong>SELENE STUDIO</strong>Một điểm hẹn cho phong cách của
                bạn.
              </p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ct-btn-directions form-btn btn btn-outline-dark fw-semibold px-4"
              >
                <i className="bi bi-sign-turn-right me-2" aria-hidden="true" />
                Chỉ đường
              </a>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

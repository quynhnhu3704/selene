// // frontend\src\pages\Contact.jsx
// import { useState } from "react";
// import { Link } from "react-router-dom";

// export default function Contact() {
//   const [form, setForm] = useState({ name: "", email: "", phone: "", content: "" });
//   const [sent, setSent] = useState(false);

//   const handleChange = (e) =>
//     setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     // TODO: gọi API gửi form
//     console.log(form);
//     setSent(true);
//     setTimeout(() => setSent(false), 3500);
//   };

//   return (
//     <>
//       <style>{`
//         /* ── BREADCRUMB WRAP ── */
//         .ct-breadcrumb-wrap {
//           padding: 13px 75px;
//           background: #fff;
//           border-bottom: 1px solid #f0f0f0;
//         }

//         /* ── PAGE WRAPPER ── */
//         .ct-page {
//           padding: 48px 75px 72px;
//           background: #fff;
//           min-height: 80vh;
//         }

//         /* ── LAYOUT: FORM trái + MAP phải ── */
//         .ct-layout {
//           display: flex;
//           align-items: flex-start;
//           gap: 48px;
//         }

//         /* ── LEFT: thông tin + form ── */
//         .ct-left {
//           flex: 0 0 46%;
//           max-width: 46%;
//         }

//         .ct-heading {
//           font-size: 17px;
//           font-weight: 800;
//           text-transform: uppercase;
//           letter-spacing: 0.5px;
//           color: #111;
//           margin-bottom: 20px;
//         }

//         /* thông tin liên hệ */
//         .ct-info { margin-bottom: 28px; }
//         .ct-info p {
//           font-size: 14.5px;
//           color: #222;
//           margin-bottom: 8px;
//           line-height: 1.6;
//         }
//         .ct-info strong { font-weight: 700; color: #111; }
//         .ct-info a { color: #871B1B; text-decoration: none; font-weight: 600; }
//         .ct-info a:hover { text-decoration: underline; }

//         /* ── FORM ── */
//         .ct-form { display: flex; flex-direction: column; gap: 14px; }

//         /* hàng ngang: họ tên + email */
//         .ct-form-row {
//           display: flex;
//           gap: 14px;
//         }
//         .ct-form-row .ct-input { flex: 1; }

//         /* input chung */
//         .ct-input {
//           width: 100%;
//           border: 1.5px solid #d8d8d8;
//           border-radius: 6px;
//           padding: 13px 15px;
//           font-size: 14px;
//           font-family: 'Montserrat', sans-serif;
//           color: #333;
//           outline: none;
//           background: #fff;
//           transition: border-color 0.2s;
//           resize: none;
//         }
//         .ct-input::placeholder { color: #bbb; }
//         .ct-input:focus { border-color: #871B1B; }

//         textarea.ct-input {
//           height: 150px;
//           resize: vertical;
//         }

//         /* nút gửi */
//         .ct-btn-submit {
//           align-self: flex-start;
//           padding: 13px 36px;
//           background: #111;
//           color: #fff;
//           font-size: 14px;
//           font-weight: 700;
//           font-family: 'Montserrat', sans-serif;
//           border: none;
//           border-radius: 6px;
//           cursor: pointer;
//           letter-spacing: 0.4px;
//           transition: background 0.18s, transform 0.1s;
//           margin-top: 4px;
//         }
//         .ct-btn-submit:hover { background: #871B1B; }
//         .ct-btn-submit:active { transform: scale(0.97); }

//         /* toast success */
//         .ct-toast {
//           margin-top: 12px;
//           padding: 10px 16px;
//           background: #e8f5e9;
//           border: 1px solid #a5d6a7;
//           border-radius: 6px;
//           font-size: 13.5px;
//           color: #2e7d32;
//           font-weight: 600;
//         }

//         /* ── RIGHT: MAP ── */
//         .ct-right {
//           flex: 1 1 0;
//           min-width: 0;
//         }

//         .ct-map-wrap {
//           width: 100%;
//           border-radius: 8px;
//           overflow: hidden;
//           border: 1px solid #e0e0e0;
//           box-shadow: 0 2px 12px rgba(0,0,0,0.08);
//           line-height: 0;
//         }

//         .ct-map-wrap iframe {
//           width: 100%;
//           height: 520px;
//           border: none;
//           display: block;
//         }

//         /* ── RESPONSIVE ── */
//         @media (max-width: 1520px) {
//           .ct-breadcrumb-wrap { padding: 13px 24px; }
//           .ct-page { padding: 36px 24px 56px; }
//         }
//         @media (max-width: 900px) {
//           .ct-layout { flex-direction: column; gap: 32px; }
//           .ct-left { flex: unset; max-width: 100%; width: 100%; }
//           .ct-right { width: 100%; }
//           .ct-map-wrap iframe { height: 360px; }
//         }
//         @media (max-width: 560px) {
//           .ct-form-row { flex-direction: column; gap: 14px; }
//           .ct-map-wrap iframe { height: 280px; }
//         }
//       `}</style>

//       {/* ── BREADCRUMB ── */}
//       <div className="ct-breadcrumb-wrap">
//         <nav aria-label="breadcrumb">
//           <ol className="breadcrumb mb-0">
//             <li className="breadcrumb-item">
//               <Link to="/">Trang chủ</Link>
//             </li>
//             <li className="breadcrumb-item active" aria-current="page">
//               Về chúng tôi
//             </li>
//           </ol>
//         </nav>
//       </div>

//       {/* ── TRANG NỘI DUNG ── */}
//       <div className="ct-page">
//         <div className="ct-layout">

//           {/* ═══ CỘT TRÁI: thông tin + form ═══ */}
//           <div className="ct-left">

//             <h1 className="ct-heading">Ý kiến của bạn về Rubies</h1>

//             <div className="ct-info">
//               <p>
//                 <strong>Địa chỉ:</strong>&nbsp;
//                 47 - 49 Trần Quang Diệu, Phường 14, Quận 3, TP. HCM
//               </p>
//               <p>
//                 <strong>Hotline:</strong>&nbsp;
//                 <a href="tel:0703470938">070 347 0938</a>
//               </p>
//               <p>
//                 <strong>Email:</strong>&nbsp;
//                 <a href="mailto:rubiesin2015@gmail.com">rubiesin2015@gmail.com</a>
//               </p>
//             </div>

//             <form className="ct-form" onSubmit={handleSubmit} noValidate>

//               {/* Họ và tên + Email */}
//               <div className="ct-form-row">
//                 <input
//                   className="ct-input"
//                   type="text"
//                   name="name"
//                   placeholder="Họ và tên"
//                   value={form.name}
//                   onChange={handleChange}
//                 />
//                 <input
//                   className="ct-input"
//                   type="email"
//                   name="email"
//                   placeholder="Email"
//                   value={form.email}
//                   onChange={handleChange}
//                 />
//               </div>

//               {/* Điện thoại */}
//               <input
//                 className="ct-input"
//                 type="tel"
//                 name="phone"
//                 placeholder="Điện thoại"
//                 value={form.phone}
//                 onChange={handleChange}
//               />

//               {/* Nội dung */}
//               <textarea
//                 className="ct-input"
//                 name="content"
//                 placeholder="Nội dung"
//                 value={form.content}
//                 onChange={handleChange}
//               />

//               <button type="submit" className="ct-btn-submit">
//                 Gửi thông tin
//               </button>

//               {sent && (
//                 <div className="ct-toast">
//                   ✓ Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất có thể.
//                 </div>
//               )}

//             </form>
//           </div>

//           {/* ═══ CỘT PHẢI: Google Map ═══ */}
//           <div className="ct-right">
//             <div className="ct-map-wrap">
//               <iframe
//                 title="Rubies Studio - Bản đồ"
//                 src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.5177580073!2d106.6827!3d10.7763!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f1b7c3a1d3b%3A0x0!2s47+Tr%E1%BA%A7n+Quang+Di%E1%BB%87u%2C+Ph%C6%B0%E1%BB%9Dng+14%2C+Qu%E1%BA%ADn+3%2C+Th%C3%A0nh+ph%E1%BB%91+H%E1%BB%93+Ch%C3%AD+Minh!5e0!3m2!1svi!2s!4v1700000000000"
//                 allowFullScreen=""
//                 loading="lazy"
//                 referrerPolicy="no-referrer-when-downgrade"
//               />
//             </div>
//           </div>

//         </div>
//       </div>
//     </>
//   );
// }

// frontend\src\pages\ProductDetail.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";

/* ── DỮ LIỆU MẪU ── */
const PRODUCT = {
  id: 1,
  sku: "WCPO25A518-SW001-S",
  name: "Áo Polo Nữ Ngắn Tay Cổ Phối Bo - Thoáng Khí - Năng Động",
  price: 199000,
  originalPrice: 299000,
  colors: [
    { label: "Trắng 001", hex: "#f5f5f0", border: "#ccc" },
    { label: "Xanh Navy", hex: "#1a2f5a", border: "#1a2f5a" },
    { label: "Đen", hex: "#111", border: "#111" },
    { label: "Xanh Rêu", hex: "#b5b87a", border: "#b5b87a" },
    { label: "Hồng", hex: "#f4b8c1", border: "#f4b8c1" },
    { label: "Xanh Đậm", hex: "#1b4332", border: "#1b4332" },
  ],
  sizes: ["S", "M", "L", "XL", "2XL"],
  images: [
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=700&h=900&fit=crop&crop=top",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=700&h=900&fit=crop&crop=top",
    "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=700&h=900&fit=crop&crop=top",
    "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=700&h=900&fit=crop&crop=top",
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=700&h=900&fit=crop&crop=top",
  ],
  detail: {
    title: "Áo Polo Nữ Phối Ngắn Tay Cổ Phối Bo Gọn Dáng, Mềm Mát Mùa Hè",
    sku: "WCPO25A518",
    lines: [
      "Dòng sản phẩm: Áo polo ngắn tay nữ cổ phối bo",
      "Chất liệu: Mắt chim - Cotton, Polyester, Spandex, cấu trúc vải pique",
      "Tính năng: Mềm mại, thoáng mát, co giãn, giữ form, hạn chế nhăn",
      "Phom dáng: Áo polo ngắn tay gọn dáng, phù hợp mọi vóc dáng.",
      "Kiểu dáng: Cổ phối bo nổi bật, tay ngắn năng động.",
      "Màu sắc: Đa dạng, phù hợp mix đồ nhiều phong cách.",
    ],
  },
  faqs: [
    {
      q: "Đặt hàng Online thành công trong bao lâu tôi sẽ nhận được hàng?",
      a: "Khách hàng khi đã được xác nhận đơn hàng đặt mua trên Website, Facebook, Zalo... và các kênh thông tin chính thức khác sẽ nhận được sản phẩm trong vòng từ 3-5 ngày làm việc (tuỳ thuộc khu vực nhận hàng).",
      bold: "trong vòng từ 3-5 ngày làm việc",
    },
    { q: "Đặt hàng Online tôi có được miễn phí vận chuyển không?", a: "" },
    { q: "Sản phẩm không vừa có thể đổi trả không?", a: "" },
  ],
  commits: [
    {
      icon: "bi-arrow-repeat",
      text1: "Đổi, trả miễn phí",
      text2: "tại nhà nếu không hài lòng",
      link: "Xem chính sách ↗",
      zalo: false,
    },
    {
      icon: "bi-truck",
      text1: "Giao trong 3-5 ngày",
      text2: "và freeship đơn từ 498k",
      link: "",
      zalo: false,
    },
    {
      icon: "bi-shield-check",
      text1: "Cam kết bảo mật",
      text2: "thông tin khách hàng",
      link: "",
      zalo: false,
    },
    {
      icon: "bi-chat-dots",
      text1: "Cần tư vấn thêm?",
      text2: "",
      link: "Chat ngay!",
      zalo: true,
    },
  ],
};

function fmt(n) {
  return n.toLocaleString("vi-VN") + "đ";
}

export default function ProductDetail() {
  const [activeImg, setActiveImg] = useState(0);
  const [activeColor, setColor] = useState(0);
  const [activeSize, setSize] = useState(0);
  const [qty, setQty] = useState(1);
  const [showMore, setShowMore] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [copied, setCopied] = useState(false);

  const copySku = () => {
    navigator.clipboard?.writeText(PRODUCT.sku);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <Helmet>
        <title>{PRODUCT.name} | Rubies</title>
      </Helmet>

      <Breadcrumb
        items={[
          { label: "Trang chủ", path: "/" },
          { label: "Sản phẩm", path: "/san-pham" },
          { label: PRODUCT.name },
        ]}
      />

      <style>{`
        /* ════════════════════
           LAYOUT
        ════════════════════ */
        .pd-page { padding: 28px 75px 64px; background: #fff; }

        .pd-layout {
          display: flex;
          gap: 40px;
          align-items: flex-start;
        }

        /* LEFT: gallery + tabs */
        .pd-left {
          flex: 0 0 52%;
          max-width: 52%;
        }

        /* RIGHT: sticky */
        .pd-right {
          flex: 1 1 0;
          min-width: 0;
          position: sticky;
          top: 80px;
          max-height: calc(100vh - 100px);
          overflow-y: auto;
          scrollbar-width: none;
          padding-bottom: 24px;
        }
        .pd-right::-webkit-scrollbar { display: none; }

        /* ════════════════════
           GALLERY
        ════════════════════ */
        .pd-gallery { display: flex; gap: 10px; }

        .pd-thumbs {
          display: flex; flex-direction: column; gap: 8px; flex: 0 0 92px;
        }
        .pd-thumb {
          width: 92px; height: 116px;
          object-fit: cover; object-position: top;
          border: 2px solid transparent; border-radius: 6px;
          cursor: pointer; transition: border-color 0.15s;
        }
        .pd-thumb.active  { border-color: #212529; }
        .pd-thumb:hover   { border-color: #6c757d; }

        .pd-main-img-wrap {
          flex: 1 1 0; position: relative;
          border-radius: 8px; overflow: hidden; background: #f5f5f5;
        }
        .pd-main-img {
          width: 100%; aspect-ratio: 3/4;
          object-fit: cover; object-position: top; display: block;
        }

        /* sale banner */
        .pd-sale-banner {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: #f5c518; padding: 10px 20px;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .pd-sale-banner span { font-size: 16px; font-weight: 800; color: #111; text-transform: uppercase; }
        .pd-sale-badge {
          background: #1a56db; color: #fff;
          font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px; letter-spacing: 1px;
        }

        /* arrows */
        .pd-arrow {
          position: absolute; bottom: 60px;
          background: #fff; border: 1px solid #ddd; border-radius: 50%;
          width: 34px; height: 34px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 15px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.12); color: #333;
          transition: box-shadow 0.15s;
        }
        .pd-arrow:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .pd-arrow.prev { right: 48px; }
        .pd-arrow.next { right: 10px; }

        /* ════════════════════
           RIGHT PANEL
        ════════════════════ */
        .pd-price { font-size: 26px; font-weight: 800; color: #212529; margin-bottom: 6px; }
        .pd-name  { font-size: 17px; font-weight: 700; color: #212529; line-height: 1.45; margin-bottom: 6px; }
        .pd-sku   { font-size: 13px; color: #6c757d; margin-bottom: 18px; display: flex; align-items: center; gap: 6px; }
        .pd-sku-copy {
          background: none; border: none; cursor: pointer;
          color: #6c757d; font-size: 14px; padding: 0; display: flex; align-items: center;
        }
        .pd-sku-copy:hover { color: #212529; }

        .pd-section-label { font-size: 14.5px; font-weight: 600; color: #212529; margin-bottom: 10px; }

        /* Màu */
        .pd-colors { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
        .pd-color-btn {
          width: 44px; height: 44px; border-radius: 50%;
          border: 2.5px solid transparent; cursor: pointer; padding: 2px;
          outline: none; background: none; transition: border-color 0.15s, transform 0.1s;
          display: flex; align-items: center; justify-content: center;
        }
        .pd-color-btn.active { border-color: #212529; }
        .pd-color-btn:hover:not(.active) { border-color: #adb5bd; }
        .pd-color-swatch { width: 34px; height: 34px; border-radius: 50%; display: block; }

        /* Size */
        .pd-size-row {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
        }
        .pd-guide-link { font-size: 13.5px; font-weight: 600; color: #1a56db; text-decoration: none; }
        .pd-guide-link:hover { text-decoration: underline; }
        .pd-sizes { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 22px; }
        .pd-size-btn {
          min-width: 46px; height: 40px; border-radius: 50%;
          border: 1.5px solid #d0d0d0; background: #fff;
          font-size: 14px; font-weight: 600; font-family: 'Nunito', sans-serif;
          color: #333; cursor: pointer; padding: 0 10px; transition: all 0.15s;
        }
        .pd-size-btn.active { border-color: #212529; background: #fff; color: #212529; }
        .pd-size-btn:hover:not(.active) { border-color: #6c757d; }

        /* Qty + cart */
        .pd-action-row { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
        .pd-qty {
          display: flex; align-items: center;
          border: 1.5px solid #d0d0d0; border-radius: 50px; overflow: hidden;
          height: 48px; flex-shrink: 0;
        }
        .pd-qty-btn {
          background: none; border: none; width: 44px; height: 100%;
          font-size: 18px; color: #333; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: color 0.15s;
        }
        .pd-qty-btn:hover { color: #871B1B; }
        .pd-qty-val { min-width: 36px; text-align: center; font-size: 16px; font-weight: 700; color: #212529; }
        .pd-btn-cart {
          flex: 1; height: 48px; background: #f5c518; border: none; border-radius: 50px;
          font-size: 16px; font-weight: 700; font-family: 'Nunito', sans-serif;
          color: #111; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.18s, transform 0.1s;
        }
        .pd-btn-cart:hover { background: #e0b40e; }
        .pd-btn-cart:active { transform: scale(0.98); }

        /* Store */
        .pd-store-link {
          display: flex; align-items: center; gap: 7px;
          font-size: 13.5px; font-weight: 600; color: #1a56db;
          text-decoration: none; margin-bottom: 20px;
        }
        .pd-store-link:hover { text-decoration: underline; }

        /* Commit */
        .pd-commit-title {
          font-size: 14.5px; font-weight: 700; color: #212529;
          margin-bottom: 12px; display: flex; align-items: center; gap: 7px;
        }
        .pd-commit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .pd-commit-card {
          border: 1.5px solid #e9ecef; border-radius: 10px; padding: 12px 14px;
          display: flex; align-items: flex-start; gap: 10px;
        }
        .pd-commit-card i { font-size: 18px; color: #495057; flex-shrink: 0; margin-top: 2px; }
        .pd-commit-text { font-size: 13px; line-height: 1.55; color: #333; }
        .pd-commit-text strong { font-weight: 700; color: #212529; }
        .pd-commit-text a { color: #1a56db; text-decoration: none; font-weight: 600; }
        .pd-commit-text a:hover { text-decoration: underline; }

        /* ════════════════════
           SECTION CARDS (left bottom)
        ════════════════════ */
        .pd-section-card {
          border: 1.5px solid #e9ecef; border-radius: 10px;
          padding: 22px 24px; margin-top: 16px;
        }
        .pd-section-card h3 { font-size: 17px; font-weight: 700; color: #212529; margin-bottom: 14px; }
        .pd-detail-sku { font-size: 13px; color: #6c757d; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
        .pd-detail-title { font-size: 15px; font-weight: 700; color: #212529; margin-bottom: 10px; }
        .pd-detail-label { font-size: 13px; font-weight: 700; color: #212529; margin-bottom: 6px; text-transform: uppercase; }
        .pd-detail-lines p { font-size: 14px; color: #444; margin-bottom: 8px; line-height: 1.6; }
        .pd-detail-blur { position: relative; overflow: hidden; }
        .pd-detail-blur::after {
          content: ""; position: absolute; bottom: 0; left: 0; right: 0;
          height: 60px; background: linear-gradient(transparent, #fff); pointer-events: none;
        }
        .pd-showmore-btn {
          background: #fff; border: 1.5px solid #212529; border-radius: 50px;
          padding: 6px 20px; font-size: 13.5px; font-weight: 700;
          font-family: 'Nunito', sans-serif; color: #212529;
          cursor: pointer; margin-top: 10px; transition: background 0.15s;
          display: block;
        }
        .pd-showmore-btn:hover { background: #f8f9fa; }

        /* FAQ */
        .pd-faq-head {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 15px; font-weight: 700; color: #212529; margin-bottom: 6px;
        }
        .pd-faq-head i { font-size: 16px; color: #6c757d; }
        .pd-faq-item { border-bottom: 1px solid #f0f0f0; padding: 14px 0; }
        .pd-faq-item:last-child { border-bottom: none; }
        .pd-faq-q {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          cursor: pointer; font-size: 14.5px; font-weight: 600; color: #212529;
        }
        .pd-faq-q i { font-size: 15px; flex-shrink: 0; color: #6c757d; }
        .pd-faq-a { margin-top: 10px; font-size: 14px; color: #555; line-height: 1.65; padding-right: 8px; }

        /* ════════════════════
           RESPONSIVE
        ════════════════════ */
        @media (max-width: 1520px) {
          .pd-page { padding: 24px 24px 56px; }
        }
        @media (max-width: 1000px) {
          .pd-layout { flex-direction: column; }
          .pd-left { flex: unset; max-width: 100%; width: 100%; }
          .pd-right { position: static; max-height: none; overflow-y: visible; }
        }
        @media (max-width: 640px) {
          .pd-commit-grid { grid-template-columns: 1fr; }
          .pd-thumbs { flex-direction: row; flex: unset; }
          .pd-thumb  { width: 70px; height: 90px; }
        }
      `}</style>

      <div className="pd-page">
        <div className="pd-layout">
          {/* ════════════ CỘT TRÁI ════════════ */}
          <div className="pd-left">
            {/* GALLERY */}
            <div className="pd-gallery">
              <div className="pd-thumbs">
                {PRODUCT.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Ảnh ${i + 1}`}
                    className={`pd-thumb${activeImg === i ? " active" : ""}`}
                    onClick={() => setActiveImg(i)}
                  />
                ))}
              </div>

              <div className="pd-main-img-wrap">
                <img
                  src={PRODUCT.images[activeImg]}
                  alt={PRODUCT.name}
                  className="pd-main-img"
                />

                <button
                  className="pd-arrow prev"
                  onClick={() =>
                    setActiveImg(
                      (p) =>
                        (p - 1 + PRODUCT.images.length) % PRODUCT.images.length,
                    )
                  }
                >
                  <i className="bi bi-chevron-left" />
                </button>
                <button
                  className="pd-arrow next"
                  onClick={() =>
                    setActiveImg((p) => (p + 1) % PRODUCT.images.length)
                  }
                >
                  <i className="bi bi-chevron-right" />
                </button>

                <div className="pd-sale-banner">
                  <span>🌐 Giá độc quyền website</span>
                  <span className="pd-sale-badge">SALE</span>
                </div>
              </div>
            </div>

            {/* CHI TIẾT SẢN PHẨM */}
            <div className="pd-section-card">
              <h3>Chi tiết sản phẩm</h3>
              <div className="pd-detail-sku">
                {PRODUCT.detail.sku}
                <button
                  className="pd-sku-copy"
                  onClick={copySku}
                  title="Sao chép"
                >
                  <i className={`bi ${copied ? "bi-check2" : "bi-copy"}`} />
                </button>
              </div>
              <p className="pd-detail-title">{PRODUCT.detail.title}</p>
              <p className="pd-detail-label">CHI TIẾT SẢN PHẨM</p>

              <div
                className={
                  !showMore
                    ? "pd-detail-blur pd-detail-lines"
                    : "pd-detail-lines"
                }
                style={!showMore ? { maxHeight: 120, overflow: "hidden" } : {}}
              >
                {PRODUCT.detail.lines.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </div>

              {!showMore && (
                <button
                  className="pd-showmore-btn"
                  onClick={() => setShowMore(true)}
                >
                  Xem thêm
                </button>
              )}
            </div>

            {/* CÂU HỎI THƯỜNG GẶP */}
            <div className="pd-section-card">
              <div className="pd-faq-head">
                <span>Câu hỏi thường gặp</span>
                <i className="bi bi-dash-circle" />
              </div>
              {PRODUCT.faqs.map((faq, i) => (
                <div className="pd-faq-item" key={i}>
                  <div
                    className="pd-faq-q"
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  >
                    <span>{faq.q}</span>
                    <i
                      className={`bi ${openFaq === i ? "bi-dash" : "bi-plus"}`}
                    />
                  </div>
                  {openFaq === i && faq.a && (
                    <div className="pd-faq-a">
                      {faq.bold
                        ? faq.a.split(faq.bold).map((part, pi) =>
                            pi === 0 ? (
                              <span key={pi}>
                                {part}
                                <strong style={{ color: "#c8860b" }}>
                                  {faq.bold}
                                </strong>
                              </span>
                            ) : (
                              <span key={pi}>{part}</span>
                            ),
                          )
                        : faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ════════════ CỘT PHẢI (sticky) ════════════ */}
          <div className="pd-right">
            {/* Giá */}
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="pd-price">{fmt(PRODUCT.price)}</div>
              {PRODUCT.originalPrice > PRODUCT.price && (
                <del className="text-muted fs-6">
                  {fmt(PRODUCT.originalPrice)}
                </del>
              )}
            </div>

            {/* Tên */}
            <div className="pd-name">{PRODUCT.name}</div>

            {/* SKU */}
            <div className="pd-sku">
              {PRODUCT.sku}
              <button
                className="pd-sku-copy"
                onClick={copySku}
                title="Sao chép"
              >
                <i className={`bi ${copied ? "bi-check2" : "bi-copy"}`} />
              </button>
            </div>

            {/* Màu sắc */}
            <div className="pd-section-label">
              Màu sắc: <strong>{PRODUCT.colors[activeColor].label}</strong>
            </div>
            <div className="pd-colors">
              {PRODUCT.colors.map((c, i) => (
                <button
                  key={i}
                  className={`pd-color-btn${activeColor === i ? " active" : ""}`}
                  onClick={() => setColor(i)}
                  title={c.label}
                >
                  <span
                    className="pd-color-swatch"
                    style={{
                      background: c.hex,
                      border: `1px solid ${c.border}`,
                    }}
                  />
                </button>
              ))}
            </div>

            {/* Kích thước */}
            <div className="pd-size-row">
              <div className="pd-section-label mb-0">
                Kích thước: <strong>{PRODUCT.sizes[activeSize]}</strong>
              </div>
              <a href="#" className="pd-guide-link">
                Hướng dẫn chọn size
              </a>
            </div>
            <div className="pd-sizes">
              {PRODUCT.sizes.map((sz, i) => (
                <button
                  key={i}
                  className={`pd-size-btn${activeSize === i ? " active" : ""}`}
                  onClick={() => setSize(i)}
                >
                  {sz}
                </button>
              ))}
            </div>

            {/* Qty + Thêm vào giỏ */}
            <div className="pd-action-row">
              <div className="pd-qty">
                <button
                  className="pd-qty-btn"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <i className="bi bi-dash" />
                </button>
                <span className="pd-qty-val">{qty}</span>
                <button
                  className="pd-qty-btn"
                  onClick={() => setQty((q) => q + 1)}
                >
                  <i className="bi bi-plus" />
                </button>
              </div>
              <button className="pd-btn-cart">
                Thêm vào giỏ&nbsp;
                <i className="bi bi-handbag" />
              </button>
            </div>

            {/* Xem cửa hàng */}
            <a href="#" className="pd-store-link">
              <i className="bi bi-shop" style={{ fontSize: 16 }} />
              Xem cửa hàng còn sản phẩm
            </a>

            {/* Cam kết */}
            <div className="pd-commit-title">
              <span>YODY cam kết</span>
              <span style={{ color: "#28a745", fontSize: 18 }}>✅</span>
            </div>
            <div className="pd-commit-grid">
              {PRODUCT.commits.map((c, i) => (
                <div className="pd-commit-card" key={i}>
                  <i className={`bi ${c.icon}`} />
                  <div className="pd-commit-text">
                    <strong>{c.text1}</strong>
                    {c.text2 && " " + c.text2}
                    {c.link && !c.zalo && (
                      <>
                        <br />
                        <a href="#">{c.link}</a>
                      </>
                    )}
                    {c.link && c.zalo && (
                      <>
                        <br />
                        <a href="#" style={{ color: "#0068ff" }}>
                          {c.link}
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

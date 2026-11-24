import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { collectionLink, collections, slides } from "./data";

export default function Collections() {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = slides[activeSlide];

  return (
    <div className="collections-page">
      <Helmet>
        <title>Bộ sưu tập | Selene</title>
        <meta name="description" content="Khám phá các bộ sưu tập thời trang được SELENE tuyển chọn theo từng chủ đề và mùa." />
      </Helmet>
      <svg className="collections-wave" viewBox="0 0 650 180" aria-hidden="true">
        <path d="M0 155C140 80 150 170 285 95S470 10 650 110V180C460 35 370 160 210 150S80 145 0 180Z" />
        <path d="M110 180C250 50 400 180 650 0V110C460 15 340 155 110 180Z" />
      </svg>
      <Breadcrumb items={[{ label: "Trang chủ", path: "/" }, { label: "Bộ sưu tập" }]} />
      <header className="collections-heading">
        <h1>Bộ sưu tập</h1>
      </header>

      <section className="collections-hero" aria-label="Bộ sưu tập mới">
        <div className="collections-hero-image" aria-hidden="true" />
        <div className="collections-hero-copy" aria-live="polite">
          <p className="collections-eyebrow">BỘ SƯU TẬP MỚI</p>
          <h2>{slide.title}</h2>
          <p className="collections-hero-description">{slide.description}</p>
          <Link to={collectionLink(slide.colors)} className="collections-cta">
            Khám phá bộ sưu tập <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
        <span className="collections-signature" aria-hidden="true">
          {slide.signature.map((word) => <span key={word}>{word}</span>)}
        </span>
        <div className="collections-dots" aria-label="Chọn bộ sưu tập">
          {slides.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className={activeSlide === index ? "is-active" : ""}
              aria-label={`Xem bộ sưu tập ${item.title}`}
              aria-pressed={activeSlide === index}
              onClick={() => setActiveSlide(index)}
            />
          ))}
        </div>
      </section>

      <section className="collections-featured" aria-labelledby="collections-featured-title">
        <div className="collections-section-heading">
          <h2 id="collections-featured-title">Các bộ sưu tập nổi bật</h2>
          <Link to="/san-pham" className="collections-view-all">
            Xem tất cả <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
        <div className="collections-grid">
          {collections.map((collection) => (
            <Link key={collection.id} to={collectionLink(collection.colors)} className="collections-card">
              <span className={`collections-card-image collections-card-image-${collection.image}`} aria-hidden="true" />
              <div className="collections-card-copy">
                <h3>{collection.title}</h3>
                <p>{collection.description}</p>
              </div>
              <span className="collections-card-arrow"><i className="bi bi-arrow-right" aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

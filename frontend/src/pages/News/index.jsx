import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { articles, categories } from "./data";
import { NewsCard, NewsDate, NewsImage } from "./components";

export default function News() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCategory = searchParams.get("danh-muc");
  const category = categories.some((item) => item.name === requestedCategory) ? requestedCategory : "Tất cả";
  const setCategory = (name) => setSearchParams(name === "Tất cả" ? {} : { "danh-muc": name }, { replace: true });
  const [showAll, setShowAll] = useState(false);
  const featured = articles[0];
  const visibleArticles = category === "Tất cả"
    ? (showAll ? [...articles.slice(4), ...articles.slice(0, 4)] : articles.slice(4))
    : articles.filter((article) => article.category === category);

  return (
    <div className="news-page">
      <Helmet><title>Tin tức | Selene</title><meta name="description" content="Cập nhật xu hướng thời trang, bí quyết phối đồ và những câu chuyện mới nhất từ Selene." /></Helmet>
      <Breadcrumb items={[{ label: "Trang chủ", path: "/" }, { label: "Tin tức" }]} />
      <header className="news-heading"><h1>Tin tức</h1></header>
      <section className="news-spotlight" aria-label="Tin tức nổi bật">
        <Link to={`/tin-tuc/${featured.slug}`} className="news-featured">
          <NewsImage article={featured} />
          <div className="news-featured-body">
            <span className="news-tag">{featured.category}</span>
            <h2>{featured.title}</h2><p>{featured.description}</p>
            <div className="news-featured-footer"><NewsDate date={featured.date} /><span className="news-read form-link-sm">Đọc ngay <i className="bi bi-arrow-right" aria-hidden="true" /></span></div>
          </div>
        </Link>
        <div className="news-side-list">
          {articles.slice(1, 4).map((article) => <Link key={article.slug} to={`/tin-tuc/${article.slug}`} className="news-side-card"><NewsImage article={article} /><div><span className="news-tag">{article.category}</span><h3>{article.title}</h3><NewsDate date={article.date} /></div></Link>)}
        </div>
      </section>
      <section className="news-categories" aria-labelledby="news-categories-title">
        <h2 id="news-categories-title">Danh mục tin tức</h2>
        <div className="news-category-grid">{categories.map((item, index) => (
          <button key={item.name} type="button" className={`news-category news-category-${index}${category === item.name ? " is-active" : ""}`} aria-pressed={category === item.name} onClick={() => { setCategory(item.name); setShowAll(false); }}>
            <span className="news-category-art" aria-hidden="true" />
            <span className="news-category-label">{item.name}</span>
          </button>
        ))}</div>
      </section>
      <section className="news-latest" aria-labelledby="news-latest-title">
        <div className="news-section-heading"><h2 id="news-latest-title">{category === "Tất cả" ? "Bài viết mới nhất" : category}</h2><button type="button" className="news-view-all form-link-sm" onClick={() => { setCategory("Tất cả"); setShowAll(!showAll); }}>{showAll ? "Thu gọn" : "Xem tất cả"}<i className="bi bi-arrow-right" aria-hidden="true" /></button></div>
        <div className="news-grid" aria-live="polite">{visibleArticles.map((article) => <NewsCard key={article.slug} article={article} />)}</div>
      </section>
    </div>
  );
}

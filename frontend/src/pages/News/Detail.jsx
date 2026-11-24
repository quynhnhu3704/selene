import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { articles } from "./data";
import { NewsCard, NewsDate, NewsImage } from "./components";

const categoryPath = (category) => `/tin-tuc?${new URLSearchParams({ "danh-muc": category })}`;

function SectionVisual({ type }) {
  if (type === "palette") return <ul className="news-detail-palette" aria-label="Bảng màu Xuân Hè">{["Trắng ngà", "Be", "Tím lavender", "Hồng phấn", "Xanh pastel"].map((color, index) => <li key={color} className={`news-swatch news-swatch-${index}`} aria-label={color} title={color} />)}</ul>;
  if (type === "fabrics") return <div className="news-detail-gallery">{["Linen", "Cotton", "Lụa"].map((fabric, index) => <figure key={fabric}><div role="img" aria-label={`Chất liệu ${fabric}`} className={`news-fabric news-fabric-${index}`} /><figcaption>{fabric}</figcaption></figure>)}</div>;
  if (type === "outfits") return <div className="news-detail-gallery">{[4, 1, 3].map((image) => <NewsImage key={image} article={articles.find((item) => item.image === image)} />)}</div>;
  return null;
}

export default function NewsDetail() {
  const { slug } = useParams();
  const article = articles.find((item) => item.slug === slug);
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  if (!article) return <div className="news-page news-not-found"><Helmet><title>Không tìm thấy bài viết | Selene</title></Helmet><h1>Không tìm thấy bài viết</h1><p>Bài viết bạn đang tìm hiện không có trong danh sách tin tức.</p><Link to="/tin-tuc" className="news-read">Quay lại tin tức <i className="bi bi-arrow-right" aria-hidden="true" /></Link></div>;

  const related = article.relatedSlugs
    ? article.relatedSlugs.map((relatedSlug) => articles.find((item) => item.slug === relatedSlug)).filter(Boolean)
    : articles.filter((item) => item.slug !== slug).sort((a, b) => Number(b.category === article.category) - Number(a.category === article.category) || b.date.localeCompare(a.date)).slice(0, 3);
  const exploreArticles = [...related, ...articles.filter((item) => item.slug !== slug && !related.some((relatedArticle) => relatedArticle.slug === item.slug)).sort((a, b) => b.date.localeCompare(a.date))].slice(0, 4);
  return (
    <div className="news-page news-detail-page">
      <Helmet><title>{article.title} | Selene</title><meta name="description" content={article.description} /></Helmet>
      <Breadcrumb items={[{ label: "Trang chủ", path: "/" }, { label: "Tin tức", path: "/tin-tuc" }, { label: article.title }]} />
      <div className="news-detail-layout">
        <article className="news-detail">
          <header>
            <Link to={categoryPath(article.category)} className="news-tag">{article.category}</Link>
            <h1>{article.title}</h1>
            <p className="news-detail-lead">{article.description}</p>
            <div className="news-detail-meta"><NewsDate date={article.date} /><span className="news-detail-author"><i className="bi bi-person" aria-hidden="true" />{article.author}</span></div>
          </header>
          <NewsImage article={article} className="news-detail-hero" />
          <div className="news-detail-copy">
            {article.introduction && <p>{article.introduction}</p>}
            {article.sections.map(([title, content], index) => <section key={title}><h2>{index + 1}. {title}</h2><p>{content}</p><SectionVisual type={article.sectionVisuals?.[index]} /></section>)}
            {article.quote && <blockquote><i className="bi bi-quote" aria-hidden="true" /><p>{article.quote}</p></blockquote>}
          </div>
          <div className="news-detail-topics"><strong>Chủ đề:</strong>{(article.topics || [article.category]).map((topic) => <Link key={topic} className="news-tag" to={categoryPath(article.category)}>{topic}</Link>)}</div>
          <div className="news-detail-back"><Link to="/tin-tuc" className="news-view-all form-link-sm"><i className="bi bi-arrow-left" aria-hidden="true" />Quay lại tin tức</Link></div>
        </article>
        <aside className="news-detail-sidebar" aria-label="Tin tức liên quan">
          <section className="news-detail-related" aria-labelledby="news-related-title"><h2 id="news-related-title">Bài viết liên quan</h2>{related.map((item) => <Link key={item.slug} to={`/tin-tuc/${item.slug}`} className="news-side-card"><NewsImage article={item} /><div><span className="news-tag">{item.category}</span><h3>{item.title}</h3><NewsDate date={item.date} /></div></Link>)}</section>
        </aside>
      </div>
      <section className="news-latest" aria-labelledby="news-explore-title">
        <div className="news-section-heading"><h2 id="news-explore-title">Khám phá thêm</h2><Link to="/tin-tuc" className="news-view-all form-link-sm">Xem tất cả<i className="bi bi-arrow-right" aria-hidden="true" /></Link></div>
        <div className="news-grid">{exploreArticles.map((item) => <NewsCard key={item.slug} article={item} />)}</div>
      </section>
    </div>
  );
}

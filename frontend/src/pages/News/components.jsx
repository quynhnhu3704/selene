import { Link } from "react-router-dom";

export function CategoryIcon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    bag: <><path d="M9 5a3 3 0 1 1 4 2.83L12 9v2" /><path d="m12 11 10 7a2 2 0 0 1-1.2 3.6H3.2A2 2 0 0 1 2 18Z" /></>,
    book: <><path d="M12 5C9 2 5 2 2 4v16c3-2 7-2 10 1 3-3 7-3 10-1V4c-3-2-7-2-10 1Z" /><path d="M12 5v16" /></>,
    gem: <><path d="m2 8 4-6h12l4 6-10 14Z" /><path d="M2 8h20M8 2 6 8l6 14 6-14-2-6" /></>,
    leaf: <><path d="M20 3C14 6 7 2 4 9c-3 8 5 13 11 8 5-4 5-10 5-14Z" /><path d="M2 22 14 10" /></>,
    star: <path d="m12 2 3.1 6.3 7 .9-5.1 5 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5.1-5 7-.9Z" />,
  };
  return <svg className="news-category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function CategoryWaves() {
  return (
    <svg className="news-category-waves" viewBox="0 0 280 104" preserveAspectRatio="none" aria-hidden="true">
      <path className="news-wave-back" d="M0 35C21 38 28 50 40 62S71 72 83 83 95 98 104 104H0ZM280 34C254 40 250 55 235 66S211 72 200 84 187 98 176 104H280Z" />
      <path className="news-wave-front" d="M0 63C22 62 31 73 49 77S79 83 91 94L101 104H0ZM280 58C265 61 259 75 242 77S209 76 195 89L180 104H280Z" />
    </svg>
  );
}

export function NewsImage({ article, className = "" }) {
  return <div role="img" aria-label={article.title} className={`news-image news-image-${article.image} ${className}`} />;
}

export function NewsDate({ date }) {
  return <time className="news-date" dateTime={date}><i className="bi bi-calendar4-week" aria-hidden="true" />{date.split("-").reverse().join(".")}</time>;
}

export function NewsCard({ article, compact = false }) {
  return (
    <Link to={`/tin-tuc/${article.slug}`} className="news-card">
      <NewsImage article={article} />
      <div className="news-card-body">
        <div className="news-card-meta"><span className="news-tag">{article.category}</span><NewsDate date={article.date} /></div>
        <h3>{article.title}</h3>
        {!compact && <><p>{article.description}</p><span className="news-read form-link-sm news-card-read">Đọc ngay <i className="bi bi-arrow-right" aria-hidden="true" /></span></>}
      </div>
    </Link>
  );
}

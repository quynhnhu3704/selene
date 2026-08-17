// frontend\src\components\layout\Breadcrumb.jsx
import { Link } from "react-router-dom";

export default function Breadcrumb({ items }) {
  return (
    // <div className="bg-light">
    <div className="container py-3" style={{ margin: "0 75px" }}>
      <nav
        aria-label="breadcrumb"
        style={{
          "--bs-breadcrumb-divider": `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M2.5 0L1 1.5 3.5 4 1 6.5 2.5 8l4-4-4-4z' fill='%236c757d'/%3E%3C/svg%3E")`,
        }}
      >
        <ol className="breadcrumb mb-0">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li
                key={index}
                className={`breadcrumb-item ${isLast ? "active" : ""}`}
                aria-current={isLast ? "page" : undefined}
              >
                {isLast ? (
                  item.label
                ) : (
                  <Link to={item.path} className="text-decoration-none">
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
    // </div>
  );
}

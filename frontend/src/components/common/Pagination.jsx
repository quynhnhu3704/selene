// frontend\src\components\common\Pagination.jsx
export default function Pagination({
  page,
  totalPages,
  totalItems,
  displayedCount,
  label,
  onPageChange,
}) {
  if (!totalPages || totalPages <= 1) return null;

  const getPages = () => {
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }

      return pages;
    }

    pages.push(1);

    if (page > 4) {
      pages.push("...");
    }

    const start = Math.max(2, page - 2);
    const end = Math.min(totalPages - 1, page + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page < totalPages - 3) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  };

  return (
    <>
      <div className="pagination-wrap">
        <div className="pagination-info">
          Hiển thị <strong>{displayedCount ?? "—"}</strong> /{" "}
          <strong>{(totalItems ?? 0).toLocaleString("vi-VN")}</strong> {label}
        </div>

        <div className="pagination-buttons">
          <button
            className="pagination-btn"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            title="Trang trước"
          >
            <i className="bi bi-chevron-double-left" style={{ fontSize: 12 }} />
          </button>

          {getPages().map((p, idx) =>
            p === "..." ? (
              <button
                key={`ellipsis-${idx}`}
                className="pagination-btn ellipsis"
              >
                ...
              </button>
            ) : (
              <button
                key={p}
                className={`pagination-btn${p === page ? " active" : ""}`}
                onClick={() => p !== page && onPageChange(p)}
              >
                {p}
              </button>
            ),
          )}

          <button
            className="pagination-btn"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            title="Trang sau"
          >
            <i
              className="bi bi-chevron-double-right"
              style={{ fontSize: 12 }}
            />
          </button>
        </div>
      </div>
    </>
  );
}

import EmptyState from "../../components/common/EmptyState";
import ProductCard from "../../components/common/ProductCard";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { useWishlist } from "../../context/WishlistContext";
import Pagination from "../../components/common/Pagination";

const PRODUCTS_PER_PAGE = 12;

const SORT_OPTIONS = [
  { key: "default", label: "Mặc định" },
  { key: "az", label: "Tên: A → Z" },
  { key: "za", label: "Tên: Z → A" },
  { key: "price_asc", label: "Giá: Thấp → Cao" },
  { key: "price_desc", label: "Giá: Cao → Thấp" },
];

export default function Wishlist() {
  const { wishlist } = useWishlist();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);
  const requestedSort = searchParams.get("sort") || "default";
  const sort = SORT_OPTIONS.some((option) => option.key === requestedSort)
    ? requestedSort
    : "default";
  const sortedProducts = useMemo(() => {
    const items = [...wishlist];
    switch (sort) {
      case "az":
        return items.sort((a, b) =>
          a.product_name.localeCompare(b.product_name, "vi"),
        );
      case "za":
        return items.sort((a, b) =>
          b.product_name.localeCompare(a.product_name, "vi"),
        );
      case "price_asc":
        return items.sort(
          (a, b) => Number(a.discount_price || 0) - Number(b.discount_price || 0),
        );
      case "price_desc":
        return items.sort(
          (a, b) => Number(b.discount_price || 0) - Number(a.discount_price || 0),
        );
      default:
        return items;
    }
  }, [wishlist, sort]);
  const totalPages = Math.ceil(wishlist.length / PRODUCTS_PER_PAGE);
  const pageParam = Number(searchParams.get("page"));
  const page = Math.min(
    Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1,
    Math.max(1, totalPages),
  );
  const products = sortedProducts.slice(
    (page - 1) * PRODUCTS_PER_PAGE,
    page * PRODUCTS_PER_PAGE,
  );

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSort = (nextSort) => {
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams);
      nextParams.delete("page");
      if (nextSort === "default") {
        nextParams.delete("sort");
      } else {
        nextParams.set("sort", nextSort);
      }
      return nextParams;
    });
  };

  const handlePage = (nextPage) => {
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams);
      if (nextPage <= 1) {
        nextParams.delete("page");
      } else {
        nextParams.set("page", String(nextPage));
      }
      return nextParams;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="pl-page pl-wishlist-page">
      <Helmet>
        <title>Sản phẩm yêu thích | Selene</title>
      </Helmet>

      <Breadcrumb
        items={[{ label: "Trang chủ", path: "/" }, { label: "Yêu thích" }]}
      />

      <div className="container pl-layout">
        <main className="pl-main">
          <div className="pl-main-top">
            <h1 className="adm-page-title">Sản phẩm yêu thích</h1>

            <div
              className="dropdown"
              ref={sortRef}
              style={{ width: "17.5%", minWidth: 190 }}
            >
              <button
                type="button"
                className="form-control text-start d-flex justify-content-between align-items-center"
                onClick={() => setSortOpen((prev) => !prev)}
              >
                <span>
                  <i className="bi bi-sort-down me-2" />
                  {SORT_OPTIONS.find((s) => s.key === sort)?.label ||
                    "Sắp xếp mặc định"}
                </span>
                <i
                  className={`bi ${sortOpen ? "bi-caret-up" : "bi-caret-down"}`}
                />
              </button>

              {sortOpen && (
                <ul className="dropdown-menu show w-100 mt-1 shadow-sm">
                  {SORT_OPTIONS.map((s) => (
                    <li key={s.key}>
                      <button
                        type="button"
                        className="dropdown-item fw-normal"
                        onClick={() => {
                          handleSort(s.key);
                          setSortOpen(false);
                        }}
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {wishlist.length === 0 ? (
            <div className="page-empty" role="status">
              <EmptyState text="Không có sản phẩm nào để hiển thị" />
            </div>
          ) : (
            <>
              <div className="pl-grid">
                {products.map((product) => (
                  <ProductCard key={product.product_id} product={product} />
                ))}
              </div>
              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={wishlist.length}
                  displayedCount={products.length}
                  label="sản phẩm"
                  onPageChange={handlePage}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

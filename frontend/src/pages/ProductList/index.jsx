import ProductLink from "../../components/common/ProductLink";
// frontend\src\pages\ProductList.jsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";
import {
  getProductFilterOptions,
  getProducts,
} from "../../services/product.service";
import { useWishlist } from "../../context/WishlistContext";
import Pagination from "../../components/common/Pagination";
import Loading from "../../components/common/Loading";
import ProductImage from "../../components/common/ProductImage";

import orangeColor from "../../assets/colors/orange.jpg";
import blackColor from "../../assets/colors/black.jpg";
import redColor from "../../assets/colors/red.jpg";
import mixedColor from "../../assets/colors/mixed.jpg";
import pinkColor from "../../assets/colors/pink.jpg";
import stripeColor from "../../assets/colors/stripe.jpg";
import brownColor from "../../assets/colors/brown.jpg";
import purpleColor from "../../assets/colors/purple.jpg";
import whiteColor from "../../assets/colors/white.jpg";
import yellowColor from "../../assets/colors/yellow.jpg";
import grayColor from "../../assets/colors/gray.jpg";
import blueColor from "../../assets/colors/blue.jpg";
import greenColor from "../../assets/colors/green.jpg";

const PRODUCTS_PER_PAGE = 12;

function FilterSkeleton({ variant }) {
  if (variant === "price") {
    return (
      <div className="pl-price-range" aria-hidden="true">
        <div className="pl-skeleton-slider">
          <span className="pl-skeleton" />
        </div>
        <div className="pl-price-values">
          <span
            className="pl-skeleton pl-skeleton-line"
            style={{ width: "28%" }}
          />
          <span
            className="pl-skeleton pl-skeleton-line"
            style={{ width: "36%" }}
          />
        </div>
      </div>
    );
  }

  if (variant === "colors") {
    return (
      <div className="pl-color-list" aria-hidden="true">
        {Array.from({ length: 13 }, (_, index) => (
          <div className="pl-color-btn" key={index}>
            <span className="pl-color-swatch pl-skeleton" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`pl-filter-skeleton pl-filter-skeleton-${variant}`}
      aria-hidden="true"
    >
      {[65, 45, 58, 40, 62].map((width, index) => (
        <div className="pl-skeleton-filter-row" key={index}>
          <span className="pl-skeleton pl-skeleton-checkbox" />
          <span
            className="pl-skeleton pl-skeleton-line"
            style={{ width: `${variant === "sizes" ? width / 2 : width}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function fmt(n) {
  return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

function getSliderStep(minPrice, maxPrice) {
  const priceRange = maxPrice - minPrice;
  const step = priceRange >= 1000000 ? 10000 : 1000;
  return priceRange % step === 0 ? step : 1;
}

const SORT_OPTIONS = [
  { key: "default", label: "Mặc định" },
  { key: "az", label: "Tên: A → Z" },
  { key: "za", label: "Tên: Z → A" },
  { key: "price_asc", label: "Giá: Thấp → Cao" },
  { key: "price_desc", label: "Giá: Cao → Thấp" },
];

const FILTER_QUERY_KEYS = [
  "q",
  "category",
  "min_price",
  "max_price",
  "sizes",
  "colors",
  "sort",
];

const FILTER_QUERY_KEY_BY_NAME = {
  categories: "category",
  sizes: "sizes",
  colors: "colors",
};

function parseListParam(value) {
  return [
    ...new Set(
      (value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function parsePriceParam(value) {
  if (value === null || value === "") return null;

  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function getProductListQueryState(searchParams) {
  const minPrice = parsePriceParam(searchParams.get("min_price"));
  const maxPrice = parsePriceParam(searchParams.get("max_price"));
  const isValidPriceRange =
    minPrice === null || maxPrice === null || minPrice <= maxPrice;
  const requestedSort = searchParams.get("sort") || "default";
  const pageParam = Number(searchParams.get("page"));

  return {
    searchQuery: searchParams.get("q")?.trim() || "",
    filters: {
      categories: parseListParam(searchParams.get("category")),
      sizes: parseListParam(searchParams.get("sizes")),
      colors: parseListParam(searchParams.get("colors")),
      minPrice: isValidPriceRange ? minPrice : null,
      maxPrice: isValidPriceRange ? maxPrice : null,
      sort: SORT_OPTIONS.some((option) => option.key === requestedSort)
        ? requestedSort
        : "default",
    },
    page: Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1,
  };
}

const COLOR_IMAGES = {
  Cam: orangeColor,
  Đen: blackColor,
  Đỏ: redColor,
  "Hỗn hợp": mixedColor,
  Hồng: pinkColor,
  Kẻ: stripeColor,
  Nâu: brownColor,
  Tím: purpleColor,
  Trắng: whiteColor,
  Vàng: yellowColor,
  Xám: grayColor,
  Xanh: blueColor,
  "Xanh lá": greenColor,
};

export default function ProductList() {
  const sidebarRef = useRef(null);

  useLayoutEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    // Tall filters scroll with the page until their bottom reaches the viewport.
    const updateStickyTop = () => {
      const top = Math.min(80, window.innerHeight - sidebar.offsetHeight - 20);
      sidebar.style.setProperty("--pl-sidebar-top", `${top}px`);
    };
    updateStickyTop();
    const observer = new ResizeObserver(updateStickyTop);
    observer.observe(sidebar);
    window.addEventListener("resize", updateStickyTop);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateStickyTop);
    };
  }, []);

  const { isFavorite, toggleWishlist } = useWishlist();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openCats, setOpenCats] = useState({});
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productError, setProductError] = useState("");
  const [filterLoading, setFilterLoading] = useState(true);
  const [filterError, setFilterError] = useState("");
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    sizes: [],
    colors: [],
    price: { min: 0, max: 0 },
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: PRODUCTS_PER_PAGE,
  });

  const queryString = searchParams.toString();
  const { filters, page, searchQuery } = useMemo(
    () => getProductListQueryState(new URLSearchParams(queryString)),
    [queryString],
  );
  const priceMin = Number(filterOptions.price.min) || 0;
  const priceMax = Math.max(priceMin, Number(filterOptions.price.max) || 0);
  const selectedMinPrice = Math.min(
    Math.max(filters.minPrice ?? priceMin, priceMin),
    priceMax,
  );
  const selectedMaxPrice = Math.max(
    Math.min(filters.maxPrice ?? priceMax, priceMax),
    priceMin,
  );
  const sliderStep = getSliderStep(priceMin, priceMax);

  const categoryNameById = useMemo(() => {
    const categoryMap = new Map();

    filterOptions.categories.forEach((category) => {
      categoryMap.set(String(category.category_id), category.name);

      (category.children || []).forEach((child) => {
        categoryMap.set(String(child.category_id), child.name);
      });
    });

    return categoryMap;
  }, [filterOptions.categories]);

  const selectedFilters = useMemo(() => {
    const selections = [];

    if (searchQuery) {
      selections.push({
        type: "search",
        value: searchQuery,
        label: 'Từ khóa: "' + searchQuery + '"',
      });
    }

    filters.categories.forEach((categoryId) => {
      selections.push({
        type: "category",
        value: categoryId,
        label: categoryNameById.get(categoryId) || "Danh mục",
      });
    });

    filters.sizes.forEach((size) => {
      selections.push({
        type: "size",
        value: size,
        label: "Size " + size.replace(/^size\s*/i, ""),
      });
    });

    filters.colors.forEach((color) => {
      selections.push({ type: "color", value: color, label: color });
    });

    if (filters.minPrice !== null || filters.maxPrice !== null) {
      selections.push({
        type: "price",
        value: "price",
        label: fmt(selectedMinPrice) + " - " + fmt(selectedMaxPrice),
      });
    }

    return selections;
  }, [
    categoryNameById,
    filters,
    searchQuery,
    selectedMinPrice,
    selectedMaxPrice,
  ]);

  const updateProductQuery = (changes, options = {}) => {
    setSearchParams((previousParams) => {
      const nextParams = new URLSearchParams(previousParams);
      const shouldResetPage = FILTER_QUERY_KEYS.some((key) => key in changes);

      Object.entries(changes).forEach(([key, value]) => {
        const normalizedValue = Array.isArray(value)
          ? value
              .map((item) => String(item).trim())
              .filter(Boolean)
              .join(",")
          : value === null || value === undefined
            ? ""
            : String(value).trim();
        const pageValue = Number(normalizedValue);
        const isDefaultValue =
          !normalizedValue ||
          (key === "sort" && normalizedValue === "default") ||
          (key === "page" && (!Number.isInteger(pageValue) || pageValue <= 1));

        if (isDefaultValue) {
          nextParams.delete(key);
          return;
        }

        nextParams.set(key, normalizedValue);
      });

      if (shouldResetPage && !("page" in changes)) {
        nextParams.delete("page");
      }

      return nextParams;
    }, options);
  };

  const toggleFilterValue = (filterName, value) => {
    const queryKey = FILTER_QUERY_KEY_BY_NAME[filterName];
    const normalizedValue = String(value);
    const selectedValues = filters[filterName];
    const nextValues = selectedValues.includes(normalizedValue)
      ? selectedValues.filter((item) => item !== normalizedValue)
      : [...selectedValues, normalizedValue];

    updateProductQuery({
      [queryKey]: nextValues,
    });
  };

  const handlePriceChange = (priceName, value) => {
    const nextValue = Number(value);
    const nextMinPrice =
      priceName === "min"
        ? Math.min(nextValue, selectedMaxPrice)
        : selectedMinPrice;
    const nextMaxPrice =
      priceName === "max"
        ? Math.max(nextValue, selectedMinPrice)
        : selectedMaxPrice;

    updateProductQuery(
      {
        min_price: nextMinPrice === priceMin ? null : nextMinPrice,
        max_price: nextMaxPrice === priceMax ? null : nextMaxPrice,
      },
      { replace: true },
    );
  };

  const removeSelectedFilter = (selection) => {
    if (selection.type === "search") {
      updateProductQuery({ q: "" });
      return;
    }

    if (selection.type === "price") {
      updateProductQuery({
        min_price: null,
        max_price: null,
      });
      return;
    }

    toggleFilterValue(selection.type + "s", selection.value);
  };

  const clearAllFilters = () => {
    updateProductQuery({
      q: "",
      category: [],
      min_price: null,
      max_price: null,
      sizes: [],
      colors: [],
      sort: "default",
    });
  };

  const handlePage = (nextPage) => {
    updateProductQuery({ page: nextPage }, { replace: false });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

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

  useEffect(() => {
    let isMounted = true;

    const fetchFilterOptions = async () => {
      try {
        setFilterLoading(true);
        setFilterError("");

        const response = await getProductFilterOptions();

        if (isMounted) {
          setFilterOptions(response.data);
        }
      } catch (error) {
        console.error(error);

        if (isMounted) {
          setFilterError("Không thể tải bộ lọc sản phẩm.");
        }
      } finally {
        if (isMounted) {
          setFilterLoading(false);
        }
      }
    };

    fetchFilterOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setProductError("");

        const res = await getProducts({
          q: searchQuery,
          categories: filters.categories,
          sizes: filters.sizes,
          colors: filters.colors,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          sort: filters.sort,
          page,
          limit: PRODUCTS_PER_PAGE,
        });

        if (isMounted) {
          setProducts(res.data || []);
          setPagination(res.pagination);
        }
      } catch (error) {
        console.error(error);

        if (isMounted) {
          setProductError("Không thể tải danh sách sản phẩm.");
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [filters, page, searchQuery]);

  const rangePercent =
    priceMax === priceMin
      ? 0
      : ((selectedMinPrice - priceMin) / (priceMax - priceMin)) * 100;
  const rangeEndPercent =
    priceMax === priceMin
      ? 100
      : ((selectedMaxPrice - priceMin) / (priceMax - priceMin)) * 100;

  return (
    <div className="pl-page">
      <Helmet>
        <title>
          {searchQuery
            ? `Tìm kiếm "${searchQuery}" | Selene`
            : "Sản phẩm | Selene"}
        </title>
      </Helmet>

      <Breadcrumb
        items={[{ label: "Trang chủ", path: "/" }, { label: "Sản phẩm" }]}
      />

      {/* ── LAYOUT: SIDEBAR + MAIN ── */}
      <div className="container pl-layout">
        {/* ══════════ SIDEBAR ══════════ */}
        <aside
          ref={sidebarRef}
          className="pl-sidebar"
          aria-label="Bộ lọc sản phẩm"
          aria-busy={filterLoading}
        >
          {selectedFilters.length > 0 && (
            <div className="pl-sidebar-section">
              <div className="pl-selected-head">
                <div className="pl-sidebar-title mb-0">Đã chọn</div>
                <button
                  className="btn btn-outline-danger btn-sm fw-medium rounded-2"
                  style={{ fontSize: "13px" }}
                  onClick={clearAllFilters}
                >
                  Xóa tất cả
                </button>
              </div>

              <div className="pl-selected-list">
                {selectedFilters.map((selection) => (
                  <button
                    className="pl-selected-chip"
                    key={selection.type + "-" + selection.value}
                    onClick={() => removeSelectedFilter(selection)}
                    title={"Bỏ lọc " + selection.label}
                  >
                    <span>{selection.label}</span>
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pl-sidebar-section">
            <div className="pl-sidebar-title">Danh mục</div>
            <div className="pl-sidebar-scroll">
              {filterLoading && <FilterSkeleton variant="categories" />}
              {!filterLoading && (
                <ul className="pl-cat-list">
                  {filterOptions.categories.map((category) => (
                    <li className="pl-cat-item" key={category.category_id}>
                      <div className="pl-cat-row">
                        <label className="pl-cat-label">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={filters.categories.includes(
                              String(category.category_id),
                            )}
                            onChange={() =>
                              toggleFilterValue(
                                "categories",
                                String(category.category_id),
                              )
                            }
                          />
                          <span>{category.name}</span>
                        </label>

                        {category.children?.length > 0 && (
                          <button
                            className="pl-cat-toggle"
                            onClick={() =>
                              setOpenCats((previousOpenCats) => ({
                                ...previousOpenCats,
                                [category.category_id]:
                                  !previousOpenCats[category.category_id],
                              }))
                            }
                            aria-label={"Mở rộng danh mục " + category.name}
                          >
                            {openCats[category.category_id] ? "−" : "+"}
                          </button>
                        )}
                      </div>

                      {category.children?.length > 0 &&
                        openCats[category.category_id] && (
                          <ul className="pl-subcat-list">
                            {category.children.map((child) => (
                              <li key={child.category_id}>
                                <label className="pl-check-label">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={filters.categories.includes(
                                      String(child.category_id),
                                    )}
                                    onChange={() =>
                                      toggleFilterValue(
                                        "categories",
                                        String(child.category_id),
                                      )
                                    }
                                  />
                                  <span>{child.name}</span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="pl-sidebar-section">
            <div className="pl-sidebar-title">Mức giá</div>

            {filterLoading ? (
              <FilterSkeleton variant="price" />
            ) : priceMax > priceMin ? (
              <div className="pl-price-range">
                <div
                  className="pl-range-track"
                  style={{
                    "--pl-range-start": rangePercent + "%",
                    "--pl-range-end": rangeEndPercent + "%",
                  }}
                >
                  <input
                    className="pl-range-input"
                    type="range"
                    min={priceMin}
                    max={priceMax}
                    step={sliderStep}
                    value={selectedMinPrice}
                    onChange={(event) =>
                      handlePriceChange("min", event.target.value)
                    }
                    aria-label="Giá thấp nhất"
                  />
                  <input
                    className="pl-range-input"
                    type="range"
                    min={priceMin}
                    max={priceMax}
                    step={sliderStep}
                    value={selectedMaxPrice}
                    onChange={(event) =>
                      handlePriceChange("max", event.target.value)
                    }
                    aria-label="Giá cao nhất"
                  />
                </div>

                <div className="pl-price-values">
                  <span>{fmt(selectedMinPrice)}</span>
                  <span>{fmt(selectedMaxPrice)}</span>
                </div>
              </div>
            ) : (
              <p className="pl-filter-message">Chưa có dữ liệu giá.</p>
            )}
          </div>

          <div className="pl-sidebar-section">
            <div className="pl-sidebar-title">Kích thước</div>
            {filterLoading && <FilterSkeleton variant="sizes" />}

            {!filterLoading && (
              <ul className="pl-check-list">
                {filterOptions.sizes.map((size) => (
                  <li key={size.value}>
                    <label className="pl-check-label">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={filters.sizes.includes(size.value)}
                        onChange={() => toggleFilterValue("sizes", size.value)}
                      />
                      <span>{size.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pl-sidebar-section">
            <div className="pl-sidebar-title">Màu sắc</div>
            {filterLoading && <FilterSkeleton variant="colors" />}

            {!filterLoading && (
              <>
                <div className="pl-color-list">
                  {filterOptions.colors.map((color) => {
                    const isSelected = filters.colors.includes(color.value);

                    return (
                      <button
                        className={
                          "pl-color-btn" + (isSelected ? " active" : "")
                        }
                        key={color.value}
                        onClick={() => toggleFilterValue("colors", color.value)}
                        title={color.label}
                        aria-label={"Lọc màu " + color.label}
                        aria-pressed={isSelected}
                      >
                        <img
                          className="pl-color-swatch"
                          src={COLOR_IMAGES[color.value]}
                          alt=""
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {filterError && <p className="pl-filter-message">{filterError}</p>}
        </aside>

        {/* ══════════ MAIN ══════════ */}
        <main className="pl-main">
          <div className="pl-main-top">
            <h1 className="adm-page-title">
              {searchQuery ? "Kết quả tìm kiếm" : "Sản phẩm"}
            </h1>

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
                  {SORT_OPTIONS.find((s) => s.key === filters.sort)?.label ||
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
                          updateProductQuery({ sort: s.key });
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

          {searchQuery && (
            <div className="pl-search-summary">
              <span>
                Có <strong>{pagination.totalItems}</strong> kết quả tìm kiếm phù
                hợp với từ khóa <strong>"{searchQuery}"</strong>
              </span>
              <button onClick={() => removeSelectedFilter({ type: "search" })}>
                Xóa kết quả tìm kiếm
              </button>
            </div>
          )}

          {loading ? (
            <Loading text="Đang tải sản phẩm..." />
          ) : productError ? (
            <div className="pl-state error">{productError}</div>
          ) : products.length === 0 ? (
            <div className="page-empty" role="status">
              <i className="bi bi-search page-empty-icon" aria-hidden="true" />
              <p className="mt-3 mb-1 fw-semibold text-secondary">
                Không tìm thấy sản phẩm
              </p>
              <p className="text-muted" style={{ fontSize: 14 }}>
                Thử lại với từ khóa hoặc bộ lọc khác!
              </p>
              {selectedFilters.length > 0 && (
                <button
                  type="button"
                  className="btn btn-dark mt-3 px-4 form-btn fw-semibold"
                  onClick={clearAllFilters}
                >
                  <i
                    className="bi bi-arrow-counterclockwise me-2"
                    aria-hidden="true"
                  />
                  Đặt lại
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="pl-grid">
                {products.map((product) => (
                  <div className="pl-pcard" key={product.product_id}>
                    <div className="pl-pimg-wrap">
                      <ProductLink productId={product.product_id}>
                        <ProductImage
                          src={product.image_url}
                          alt=""
                          loading="lazy"
                        />
                        {product.second_image_url && (
                          <img
                            key={product.second_image_url}
                            className="pl-pimg-secondary"
                            src={product.second_image_url}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                      </ProductLink>
                      <button
                        type="button"
                        className={`pl-favorite${isFavorite(product.product_id) ? " active" : ""}`}
                        onClick={() => toggleWishlist(product)}
                        aria-pressed={isFavorite(product.product_id)}
                        aria-label={
                          isFavorite(product.product_id)
                            ? "Bỏ yêu thích " + product.product_name
                            : "Yêu thích " + product.product_name
                        }
                      >
                        <i
                          className={`bi ${isFavorite(product.product_id) ? "bi-suit-heart-fill" : "bi-suit-heart"}`}
                        />
                      </button>
                    </div>

                    <div className="pl-pinfo">
                      <ProductLink
                        className="pl-pname"
                        productId={product.product_id}
                      >
                        {product.product_name}
                      </ProductLink>

                      <div className="pl-price-row">
                        <span className="pl-price-current">
                          {fmt(product.discount_price)}
                        </span>

                        <span className="pl-price-original">
                          {fmt(product.original_price)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Pagination
                page={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                displayedCount={products.length}
                label="sản phẩm"
                onPageChange={handlePage}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

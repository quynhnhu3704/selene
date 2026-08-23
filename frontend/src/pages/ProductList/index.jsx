// frontend\src\pages\ProductList.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";
import {
  getProductFilterOptions,
  getProducts,
} from "../../services/product.service";
import Pagination from "../../components/common/Pagination";

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

function fmt(n) {
  return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

function getSliderStep(minPrice, maxPrice) {
  return maxPrice - minPrice >= 1000000 ? 10000 : 1000;
}

const SORT_OPTIONS = [
  { value: "default", label: "Mặc định" },
  { value: "az", label: "A → Z" },
  { value: "za", label: "Z → A" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
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
      sort: SORT_OPTIONS.some((option) => option.value === requestedSort)
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [openCats, setOpenCats] = useState({});
  const [sortOpen, setSortOpen] = useState(false);
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

  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === filters.sort)?.label ??
    "Mặc định";

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
      selections.push({ type: "size", value: size, label: "Size " + size });
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

  const handleSort = (sort) => {
    updateProductQuery({
      sort,
    });
    setSortOpen(false);
  };

  const handlePage = (nextPage) => {
    updateProductQuery({ page: nextPage }, { replace: false });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

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
    <>
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

      <style>{`
        /* ── LAYOUT ── */
        .pl-layout {
          display: flex;
          align-items: flex-start;
          gap: 0;
          padding: 0 75px 60px;
          background: #fff;
          min-height: 80vh;
        }

        /* ════════════
           SIDEBAR
        ════════════ */
        .pl-sidebar {
          flex: 0 0 290px;
          width: 290px;
          padding: 28px 0 0;
          border-right: 1px solid #ebebeb;
          min-height: 100%;
        }

        .pl-sidebar-section { margin-bottom: 28px; }

        .pl-sidebar-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          color: #111;
          margin-bottom: 12px;
        }

        /* "Xem tất cả danh mục" dropdown */
        .pl-cat-all-btn {
          background: none;
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 13px;
          font-family: 'Montserrat', sans-serif;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
        }
        .pl-cat-all-btn:hover { border-color: #871B1B; color: #871B1B; }

        /* Danh mục list */
        .pl-cat-list { list-style: none; padding: 0; margin: 0; }
        .pl-cat-item { border-bottom: 1px solid #f2f2f2; }
        .pl-cat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 9px 4px 9px 0;
          font-size: 13.5px;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          text-decoration: none;
        }
        .pl-cat-row:hover { color: #871B1B; }
        .pl-cat-toggle {
          background: none;
          border: 1px solid #ccc;
          border-radius: 3px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #666;
          font-size: 14px;
          line-height: 1;
          flex-shrink: 0;
        }
        .pl-cat-toggle:hover { border-color: #871B1B; color: #871B1B; }

        /* Sub-categories */
        .pl-subcat-list {
          list-style: none;
          padding: 0 0 6px 14px;
          margin: 0;
        }
        .pl-subcat-list li a {
          display: block;
          padding: 5px 0;
          font-size: 13px;
          color: #555;
          text-decoration: none;
        }
        .pl-subcat-list li a:hover { color: #871B1B; }

        /* Sidebar scrollbar strip */
        .pl-sidebar-scroll {
          max-height: 420px;
          overflow-y: auto;
          padding-right: 4px;
          scrollbar-width: thin;
          scrollbar-color: #222 #f0f0f0;
          border-left: 3px solid transparent;
        }
        .pl-sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .pl-sidebar-scroll::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        .pl-sidebar-scroll::-webkit-scrollbar-track { background: #f0f0f0; }

        /* Checkbox filter */
        .pl-check-list { list-style: none; padding: 0; margin: 0; }
        .pl-check-list li {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 5px 0;
          font-size: 13.5px;
          color: #333;
          cursor: pointer;
        }
        .pl-check-list li input[type="checkbox"] {
          width: 15px; height: 15px;
          accent-color: #871B1B;
          cursor: pointer;
          flex-shrink: 0;
        }
        .pl-check-list li:hover { color: #871B1B; }

        /* Price filter scrollbar strip */
        .pl-price-scroll {
          max-height: 180px;
          overflow-y: auto;
          padding-right: 4px;
          scrollbar-width: thin;
          scrollbar-color: #222 #f0f0f0;
        }
        .pl-price-scroll::-webkit-scrollbar { width: 3px; }
        .pl-price-scroll::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }

        /* Size */
        .pl-size-wrap { display: flex; flex-wrap: wrap; gap: 7px; }
        .pl-size-btn {
          border: 1px solid #ccc;
          background: #fff;
          border-radius: 4px;
          padding: 5px 12px;
          font-size: 12.5px;
          font-family: 'Montserrat', sans-serif;
          color: #333;
          cursor: pointer;
        }
        .pl-size-btn:hover,
        .pl-size-btn.active { border-color: #222; background: #222; color: #fff; }

        /* ════════════
           MAIN CONTENT
        ════════════ */
        .pl-main {
          flex: 1 1 0;
          min-width: 0;
          padding: 28px 0 0 36px;
        }

        /* TOP ROW: title + sort */
        .pl-main-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .pl-main-heading {
          font-size: 18px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #111;
        }

        /* Sort dropdown */
        .pl-sort-wrap { position: relative; }
        .pl-sort-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          font-size: 13.5px;
          font-family: 'Montserrat', sans-serif;
          color: #333;
          cursor: pointer;
          padding: 0;
        }
        .pl-sort-btn i { font-size: 15px; color: #555; }
        .pl-sort-btn strong { color: #111; font-weight: 700; }
        .pl-sort-btn .bi-chevron-down { font-size: 12px; }

        .pl-sort-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.12);
          z-index: 100;
          min-width: 170px;
          overflow: hidden;
        }
        .pl-sort-option {
          display: block;
          width: 100%;
          padding: 10px 18px;
          font-size: 13.5px;
          font-family: 'Montserrat', sans-serif;
          font-weight: 500;
          color: #333;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          white-space: nowrap;
        }
        .pl-sort-option:hover { background: #f5f5f5; color: #111; }
        .pl-sort-option.selected { background: #222; color: #fff; font-weight: 700; }

        /* ── PRODUCT GRID ── */
        .pl-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px 20px;
          margin-bottom: 40px;
        }

        .pl-pcard { cursor: pointer; }
        .pl-pimg-wrap {
          position: relative;
          overflow: hidden;
          background: #f5f5f5;
          margin-bottom: 0;
        }
        .pl-pimg-wrap a { display: block; }
        .pl-pimg-wrap img {
          width: 100%;
          aspect-ratio: 3/4;
          object-fit: cover;
          object-position: top center;
          display: block;
          transition: transform 0.35s ease;
        }
        .pl-pcard:hover .pl-pimg-wrap img { transform: scale(1.04); }

        .pl-pinfo { padding: 10px 0 6px; }
        .pl-pname {
          font-size: 13px;
          color: #222;
          text-decoration: none;
          font-weight: 500;
          line-height: 1.45;
          display: block;
          margin-bottom: 10px;
        }
        .pl-pname:hover { color: #871B1B; }

        .pl-price-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .pl-price-current {
          font-size: 14px;
          font-weight: 700;
          color: #111;
        }
        .pl-price-original {
          font-size: 13px;
          color: #aaa;
          text-decoration: line-through;
          font-weight: 400;
        }

        /* ── PAGINATION ── */
        .pl-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .pl-pg-btn {
          min-width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid #d0d0d0;
          background: #fff;
          font-size: 13.5px;
          font-family: 'Montserrat', sans-serif;
          font-weight: 600;
          color: #333;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          padding: 0 4px;
        }
        .pl-pg-btn:hover:not(:disabled):not(.active) {
          border-color: #222;
          color: #111;
        }
        .pl-pg-btn.active {
          background: #111;
          color: #fff;
          border-color: #111;
        }
        .pl-pg-btn:disabled { opacity: 0.4; cursor: default; }
        .pl-pg-ellipsis { border: none; background: none; cursor: default; }
        .pl-pg-next { font-size: 16px; }

        /* ── RESPONSIVE ── */
        @media (max-width: 1100px) {
          .pl-layout { padding: 0 24px 48px; }
          .pl-sidebar { flex: 0 0 230px; width: 230px; }
        }
        @media (max-width: 900px) {
          .pl-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 1520px) {
          .pl-breadcrumb-wrap { padding: 13px 24px; }
          .pl-layout { padding: 0 16px 48px; }
          .pl-sidebar { flex: 0 0 220px; width: 220px; }
          .pl-main { padding-left: 20px; }
        }
        @media (max-width: 640px) {
          .pl-sidebar { display: none; }
          .pl-main { padding-left: 0; }
          .pl-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
        }

        /* Bộ lọc dữ liệu thật */
        .pl-sidebar {
          padding-right: 22px;
        }
        .pl-selected-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }
        .pl-clear-all {
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 5px 9px;
          background: #fff;
          color: #333;
          cursor: pointer;
          font-family: "Montserrat", sans-serif;
          font-size: 12px;
          font-weight: 600;
        }
        .pl-clear-all:hover {
          border-color: #871b1b;
          color: #871b1b;
        }
        .pl-selected-empty {
          margin: 0;
          color: #8a8a8a;
          font-size: 12.5px;
          line-height: 1.5;
        }
        .pl-selected-list {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }
        .pl-selected-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          max-width: 100%;
          border: 1px solid #e2b8b8;
          border-radius: 999px;
          padding: 5px 8px 5px 10px;
          background: #fff7f7;
          color: #6f1515;
          cursor: pointer;
          font-size: 12px;
          text-align: left;
        }
        .pl-selected-chip span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pl-selected-chip i {
          font-size: 13px;
        }
        .pl-cat-all-btn:disabled {
          cursor: default;
          opacity: 0.5;
        }
        .pl-cat-label,
        .pl-check-label {
          display: flex;
          align-items: center;
          gap: 9px;
          flex: 1;
          min-width: 0;
          color: inherit;
          cursor: pointer;
        }
        .pl-cat-label .form-check-input,
        .pl-check-label .form-check-input {
          margin: 0;
          cursor: pointer;
          flex: 0 0 auto;
        }
        .pl-cat-row {
          gap: 8px;
        }
        .pl-subcat-list li {
          padding: 4px 0;
        }
        .pl-subcat-list .pl-check-label {
          font-size: 13px;
        }
        .pl-price-range {
          padding: 4px 0 2px;
        }
        .pl-range-track {
          position: relative;
          height: 22px;
          margin: 0 4px 12px;
          background: linear-gradient(
            to right,
            #e5e5e5 0%,
            #e5e5e5 var(--pl-range-start),
            #871b1b var(--pl-range-start),
            #871b1b var(--pl-range-end),
            #e5e5e5 var(--pl-range-end),
            #e5e5e5 100%
          );
          background-position: center;
          background-repeat: no-repeat;
          background-size: 100% 4px;
        }
        .pl-range-input {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 22px;
          margin: 0;
          appearance: none;
          background: transparent;
          pointer-events: none;
        }
        .pl-range-input::-webkit-slider-thumb {
          width: 16px;
          height: 16px;
          border: 2px solid #871b1b;
          border-radius: 50%;
          background: #fff;
          appearance: none;
          cursor: pointer;
          pointer-events: auto;
        }
        .pl-range-input::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border: 2px solid #871b1b;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          pointer-events: auto;
        }
        .pl-price-values {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          color: #555;
          font-size: 12px;
          font-weight: 600;
        }
        .pl-color-list {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }
        .pl-color-btn {
          position: relative;
          border: 1px solid #E6E6E6;
          padding: 0.25em;
          border-radius: 0.65em;
          background: #fff;
          cursor: pointer;
          transition: border-color 0.15s, transform 0.15s;
        }
        .pl-color-btn:hover {
          border: 1px solid #871b1b;
        }
        .pl-color-btn.active {
          border-color: #871b1b;
        }
        .pl-color-swatch {
          display: block;
          width: 37.4px;
          height: 37.4px;
          border-radius: 0.35em;
          object-fit: cover;
        }
        .pl-filter-message {
          margin: 10px 0 0;
          color: #777;
          font-size: 12px;
          line-height: 1.45;
        }
        .pl-filter-message {
          margin-top: 0;
          font-size: 13px;
        }
        .pl-search-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 22px;
          padding: 10px 12px;
          border-left: 3px solid #871b1b;
          background: #fff8f8;
          color: #333;
          font-size: 13.5px;
        }
        .pl-search-summary button {
          flex: 0 0 auto;
          border: 0;
          padding: 0;
          background: transparent;
          color: #871b1b;
          cursor: pointer;
          font-size: 12.5px;
          font-weight: 700;
        }
        .pl-state {
          padding: 40px 0;
          color: #666;
          text-align: center;
        }
        .pl-state.error {
          color: #871b1b;
        }
        @media (max-width: 640px) {
          .pl-layout {
            display: block;
            padding: 0 16px 42px;
          }
          .pl-sidebar {
            display: block;
            width: 100%;
            padding-right: 0;
            border-right: 0;
            border-bottom: 1px solid #ebebeb;
          }
          .pl-main {
            padding-left: 0;
          }
          .pl-search-summary {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>

      {/* ── LAYOUT: SIDEBAR + MAIN ── */}
      <div className="pl-layout">
        {/* ══════════ SIDEBAR ══════════ */}
        <aside className="pl-sidebar" aria-label="Bộ lọc sản phẩm">
          <div className="pl-sidebar-section">
            <div className="pl-selected-head">
              <div className="pl-sidebar-title mb-0">Bạn chọn</div>
              {selectedFilters.length > 0 && (
                <button className="pl-clear-all" onClick={clearAllFilters}>
                  Bỏ hết
                </button>
              )}
            </div>

            {selectedFilters.length > 0 ? (
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
            ) : (
              <p className="pl-selected-empty">Chưa có bộ lọc nào được chọn.</p>
            )}
          </div>

          <div className="pl-sidebar-section">
            <div className="pl-sidebar-title">Danh Mục Sản Phẩm</div>
            <button
              className="pl-cat-all-btn"
              onClick={() => updateProductQuery({ category: [] })}
              disabled={filters.categories.length === 0}
            >
              Tất cả danh mục
            </button>

            <div className="pl-sidebar-scroll">
              {filterLoading ? (
                <p className="pl-filter-message">Đang tải danh mục...</p>
              ) : (
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
            <div className="pl-sidebar-title">Mức Giá</div>

            {filterLoading ? (
              <p className="pl-filter-message">Đang tải khoảng giá...</p>
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
            <div className="pl-sidebar-title">Kích Thước</div>

            {filterLoading ? (
              <p className="pl-filter-message">Đang tải size...</p>
            ) : (
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
            <div className="pl-sidebar-title">Màu Sắc</div>

            {filterLoading ? (
              <p className="pl-filter-message">Đang tải màu sắc...</p>
            ) : (
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
                          alt={color.label}
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
            <h1 className="pl-main-heading">
              {searchQuery ? "Kết quả tìm kiếm" : "Sản phẩm"}
            </h1>

            <div className="pl-sort-wrap">
              <button
                className="pl-sort-btn"
                onClick={() => setSortOpen((isOpen) => !isOpen)}
              >
                <i className="bi bi-sort-down-alt" />
                <span>
                  Sắp xếp: <strong>{sortLabel}</strong>
                </span>
                <i className="bi bi-chevron-down" />
              </button>

              {sortOpen && (
                <div className="pl-sort-menu">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={
                        "pl-sort-option" +
                        (filters.sort === option.value ? " selected" : "")
                      }
                      onClick={() => handleSort(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
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
            <div className="pl-state">Đang tải sản phẩm...</div>
          ) : productError ? (
            <div className="pl-state error">{productError}</div>
          ) : products.length === 0 ? (
            <div className="pl-state">
              Không tìm thấy sản phẩm phù hợp với bộ lọc đã chọn.
            </div>
          ) : (
            <>
              <div className="pl-grid">
                {products.map((product) => (
                  <div className="pl-pcard" key={product.product_id}>
                    <div className="pl-pimg-wrap">
                      <Link to={"/san-pham/" + product.product_id}>
                        <img
                          src={product.image_url}
                          alt={product.product_name}
                          loading="lazy"
                        />
                      </Link>
                    </div>

                    <div className="pl-pinfo">
                      <Link
                        className="pl-pname"
                        to={"/san-pham/" + product.product_id}
                      >
                        {product.product_name}
                      </Link>

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

      {/* Đóng sort menu khi click ngoài */}
      {sortOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => setSortOpen(false)}
        />
      )}
    </>
  );
}

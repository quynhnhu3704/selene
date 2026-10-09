// // frontend\src\pages\Home\index.jsx
// import { useState } from "react";
// import { Helmet } from "react-helmet-async";

// import Hero from "./components/Hero";
// import Features from "./components/Features";
// import ProductSection from "./components/ProductSection";

// import { bestSellers, newProds } from "./data/products";

// export default function Home() {
//   return (
//     <>
//       <Helmet>
//         <title>Selene - Thời Trang Nữ Cao Cấp</title>
//       </Helmet>

//       <Hero />
//       <Features />

//       <ProductSection
//         title="Sản Phẩm Bán Chạy"
//         items={bestSellers}
//         type="best"
//       />

//       <ProductSection title="Sản Phẩm Mới" items={newProds} type="new" />

//       <div className="rb-feel">
//         <h2>FEEL SELENE, FEEL ELEGANT</h2>
//         <p>SELENE SINCE 2026</p>
//       </div>
//     </>
//   );
// }

import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";

import Hero from "./components/Hero";
import Features from "./components/Features";
import ProductSection from "./components/ProductSection";
import CategorySection from "./components/CategorySection";

import {
  getProducts,
  getProductFilterOptions,
} from "../../services/product.service";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const loadSection = async (request, setData, selectData, setBusy) => {
      setBusy(true);
      try {
        const response = await request();
        if (!signal.aborted) setData(selectData(response));
      } catch (error) {
        if (!signal.aborted) {
          console.error("Không thể tải dữ liệu trang chủ:", error);
        }
      } finally {
        if (!signal.aborted) setBusy(false);
      }
    };

    void loadSection(
      () => getProducts({ limit: 20 }, 12, { signal }),
      setProducts,
      (response) => response.data || [],
      setLoading,
    );
    void loadSection(
      () => getProductFilterOptions({ signal }),
      setCategories,
      (response) => response.data?.categories || [],
      setCategoryLoading,
    );

    return () => controller.abort();
  }, []);

  /*
   * Tạm thời:
   * - Bán chạy: lấy nhóm sản phẩm đầu tiên
   * - Sản phẩm mới: lấy nhóm tiếp theo
   *
   * Sau này backend có API best-selling/newest
   * thì chỉ thay phần query, ProductSection không cần đổi.
   */
  const bestSellers = products.slice(0, 10);
  const newProducts = products.slice(10, 20);

  return (
    <>
      <Helmet>
        <title>Selene - Thời Trang Nữ Cao Cấp</title>
      </Helmet>

      <Hero />

      <Features />

      <CategorySection categories={categories} loading={categoryLoading} />

      <ProductSection
        title="Sản Phẩm Bán Chạy"
        products={bestSellers}
        type="best"
        loading={loading}
      />

      <ProductSection
        title="Sản Phẩm Mới"
        products={newProducts}
        type="new"
        loading={loading}
      />

      <div className="rb-feel">
        <h2>FEEL SELENE, FEEL ELEGANT</h2>
        <p>SELENE SINCE 2026</p>
      </div>
    </>
  );
}

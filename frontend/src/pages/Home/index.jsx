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
    let isMounted = true;

    const fetchHomeData = async () => {
      try {
        setLoading(true);

        const [productRes, filterRes] = await Promise.all([
          getProducts({
            q: "",
            categories: [],
            sizes: [],
            colors: [],
            minPrice: null,
            maxPrice: null,
            sort: "default",
            page: 1,
            limit: 20,
          }),
          getProductFilterOptions(),
        ]);

        if (isMounted) {
          setProducts(productRes.data || []);
          setCategories(filterRes.data?.categories || []);
        }
      } catch (error) {
        console.error("Không thể tải dữ liệu trang chủ:", error);

        if (isMounted) {
          setProducts([]);
          setCategories([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setCategoryLoading(false);
        }
      }
    };

    fetchHomeData();

    return () => {
      isMounted = false;
    };
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

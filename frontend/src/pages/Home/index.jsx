// frontend\src\pages\Home\index.jsx
import { useState } from "react";
import { Helmet } from "react-helmet-async";

import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import Hero from "./components/Hero";
import Features from "./components/Features";
import ProductSection from "./components/ProductSection";

import { bestSellers, newProds } from "./data/products";

export default function Home() {
  return (
    <>
      <Helmet>
        <title>Selene - Thời Trang Nữ Cao Cấp</title>
      </Helmet>

      <Hero />
      <Features />

      <ProductSection
        title="Sản Phẩm Bán Chạy"
        items={bestSellers}
        type="best"
      />

      <ProductSection title="Sản Phẩm Mới" items={newProds} type="new" />

      <div className="rb-feel">
        <h2>FEEL SELENE, FEEL ELEGANT</h2>
        <p>SELENE SINCE 2026</p>
      </div>
    </>
  );
}

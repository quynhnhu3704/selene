// frontend\src\pages\Home\index.jsx
import { useState } from "react";

import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import Hero from "./components/Hero";
import Features from "./components/Features";
import ProductSection from "./components/ProductSection";

import { bestSellers, newProds } from "./data/products";

export default function Home() {
  return (
    <>
      <Header />

      <Hero />
      <Features />

      <ProductSection
        title="Sản Phẩm Bán Chạy"
        items={bestSellers}
        type="best"
      />

      <ProductSection
        title="Sản Phẩm Mới"
        items={newProds}
        type="new"
      />

      <div className="rb-feel">
        <h2>FEEL SELENE, FEEL ELEGANT</h2>
        <p>SELENE SINCE 2026</p>
      </div>

      <Footer />

      {/* Scroll to top button */}
      <button className="rb-scroll-top" onClick={() => window.scrollTo({top:0,behavior:"smooth"})}><i class="bi bi-chevron-double-up"></i></button>
    </>
  );
}
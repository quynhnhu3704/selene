// frontend\src\components\layout\MainLayout.jsx
import Header from "./Header";
import Footer from "./Footer";
import { Outlet } from "react-router-dom";
import Chatbot from "../Chatbot";

export default function MainLayout() {
  return (
    <>
      <Header />

      <main>
        <Outlet />
      </main>

      <Footer />

      {/* Hiển thị trợ lý Selene xuyên suốt các trang khách hàng. */}
      <Chatbot />

      {/* Scroll to top button */}
      <button
        className="rb-scroll-top"
        style={{ right: 104 }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <i className="bi bi-chevron-double-up"></i>
      </button>
    </>
  );
}

// frontend\src\components\layout\MainLayout.jsx
import Header from "./Header";
import Footer from "./Footer";
import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function MainLayout() {
  return (
    <>
      <Header />

      <main>
        <Outlet />
      </main>

      <Footer />

      <ToastContainer position="top-right" autoClose={4000} newestOnTop closeOnClick />

      {/* Scroll to top button */}
      <button className="rb-scroll-top" onClick={() => window.scrollTo({top:0,behavior:"smooth"})}><i className="bi bi-chevron-double-up"></i></button>
    </>
  );
}
// frontend\src\components\layout\MainLayout.jsx
import Header from "./Header";
import Footer from "./Footer";
import { Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <>
      <Header />

      <main>
        <Outlet />
      </main>

      <Footer />

      {/* Scroll to top button */}
      <button className="rb-scroll-top" onClick={() => window.scrollTo({top:0,behavior:"smooth"})}><i className="bi bi-chevron-double-up"></i></button>
    </>
  );
}
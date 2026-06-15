// frontend\src\app\router\index.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../../components/layout/MainLayout";

import Home from "../../pages/Home";
import Login from "../../pages/Account/Login";
import Register from "../../pages/Account/Register";
import ProductList from "../../pages/ProductList";
import About from "../../pages/About";

export default function AppRouter() {
  return (
    <Routes>

      {/* Layout chung */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} /> 
        <Route path="/tai-khoan/dang-nhap" element={<Login />} />
        <Route path="/tai-khoan/dang-ky" element={<Register />} />
        
        <Route path="/san-pham" element={<ProductList />} />
        <Route path="/ve-chung-toi" element={<About />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
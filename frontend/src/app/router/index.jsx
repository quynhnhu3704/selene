// frontend\src\app\router\index.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../../components/layout/MainLayout";

import Home from "../../pages/Home";
import Login from "../../pages/Account/Login";
import Register from "../../pages/Account/Register";
import ProductList from "../../pages/ProductList";
import ProductDetail from "../../pages/ProductDetail";
import About from "../../pages/About";
import GoogleSuccess from "../../pages/Account/GoogleSuccess";
import Profile from "../../pages/Account/Profile";

export default function AppRouter() {
  return (
    <Routes>

      {/* Layout chung */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} /> 
        <Route path="/tai-khoan/dang-nhap" element={<Login />} />
        <Route path="/tai-khoan/dang-ky" element={<Register />} />
        <Route path="/tai-khoan/thong-tin-ca-nhan" element={<Profile />} />
        <Route path="/auth/success" element={<GoogleSuccess />} />
        
        <Route path="/san-pham" element={<ProductList />} />
        <Route path="/chi-tiet-san-pham" element={<ProductDetail />} />
        <Route path="/ve-chung-toi" element={<About />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
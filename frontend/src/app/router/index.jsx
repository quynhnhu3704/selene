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

import Info from "../../pages/Account/Profile/pages/Info";
import Orders from "../../pages/Account/Profile/pages/Orders";
import ChangePassword from "../../pages/Account/Profile/pages/ChangePassword";

export default function AppRouter() {
  return (
    <Routes>

      {/* Layout chung */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} /> 
        <Route path="/tai-khoan/dang-nhap" element={<Login />} />
        <Route path="/tai-khoan/dang-ky" element={<Register />} />
        
        {/* ===== TÀI KHOẢN ===== */}
        <Route path="/tai-khoan" element={<Profile />}>
          <Route index element={<Info />} />
          <Route path="don-hang" element={<Orders />} />
          <Route path="doi-mat-khau" element={<ChangePassword />} />
        </Route>

        <Route path="/auth/success" element={<GoogleSuccess />} />
        
        <Route path="/san-pham" element={<ProductList />} />
        <Route path="/san-pham/:id" element={<ProductDetail />} />
        <Route path="/ve-chung-toi" element={<About />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
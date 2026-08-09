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
import Cart from "../../pages/Cart";
import Checkout from "../../pages/Checkout";
import Payment from "../../pages/Payment";

import Info from "../../pages/Account/Profile/pages/Info";
import Orders from "../../pages/Account/Profile/pages/Orders";
import ChangePassword from "../../pages/Account/Profile/pages/ChangePassword";
import ForgotPassword from "../../pages/Account/ForgotPassword";

import AdminLayout from "../../pages/Admin";
import AdminDashboard from "../../pages/Admin/Dashboard";
import AdminProducts from "../../pages/Admin/Products";
import AdminOrders from "../../pages/Admin/Orders";
import AdminUsers from "../../pages/Admin/Users";
import AdminCategories from "../../pages/Admin/Categories";

export default function AppRouter() {
  return (
    <Routes>

      {/* Layout chung */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} /> 

        {/* ===== XÁC THỰC ===== */}
        <Route path="/tai-khoan/dang-nhap" element={<Login />} />
        <Route path="/tai-khoan/dang-ky" element={<Register />} />
        <Route path="/tai-khoan/quen-mat-khau" element={<ForgotPassword />} />
        
        {/* ===== TÀI KHOẢN ===== */}
        <Route path="/tai-khoan" element={<Profile />}>
          <Route index element={<Info />} />
          <Route path="don-hang" element={<Orders />} />
          <Route path="doi-mat-khau" element={<ChangePassword />} />
        </Route>

        {/* ===== GOOGLE CALLBACK ===== */}
        <Route path="/auth/success" element={<GoogleSuccess />} />
        
        {/* ===== SẢN PHẨM ===== */}
        <Route path="/san-pham" element={<ProductList />} />
        <Route path="/san-pham/:id" element={<ProductDetail />} />

        {/* ===== GIỎ HÀNG ===== */}
        <Route path="/gio-hang" element={<Cart />} />

        {/* ===== THANH TOÁN ===== */}
        <Route path="/thanh-toan" element={<Checkout />} />
        <Route path="/thanh-toan/qr" element={<Payment />} />

        <Route path="/ve-chung-toi" element={<About />} />
      </Route>

      {/* Layout Admin */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index                   element={<AdminDashboard />} />
        <Route path="san-pham"         element={<AdminProducts />} />
        <Route path="don-hang"         element={<AdminOrders />} />
        <Route path="nguoi-dung"       element={<AdminUsers />} />
        <Route path="danh-muc"         element={<AdminCategories />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
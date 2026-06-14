// frontend\src\app\router\index.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../../components/layout/MainLayout";

import Home from "../../pages/Home";
import Login from "../../pages/Login";
import Register from "../../pages/Register";

export default function AppRouter() {
  return (
    <Routes>

      {/* Layout chung */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} /> 
        <Route path="/dang-nhap" element={<Login />} />
        <Route path="/dang-ky" element={<Register />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
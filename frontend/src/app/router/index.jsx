// frontend\src\app\router\index.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "../../pages/Home";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
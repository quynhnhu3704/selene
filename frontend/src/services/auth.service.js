// frontend\src\services\auth.service.js
import http from "./http";

export const register = (data) => {
  return http.post("/auth/register", data);
};

export const login = (data) => {
  return http.post("/auth/login", data);
};

export const logout = () => {
  return http.post("/auth/logout");
};

// THÊM
export const refreshToken = () => {
  return http.post("/auth/refresh-token");
};
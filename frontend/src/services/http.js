// frontend\src\services\http.js
import axios from "axios";
import {
    getAccessToken,
    saveAccessToken,
    logout
} from "../utils/auth";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  withCredentials: true
});

// interceptor (sau này thêm token)
http.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
      config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// interceptor (nếu token hết hạn, gọi refresh token)
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url.includes("/auth/login") &&
        !originalRequest.url.includes("/auth/register") &&
        !originalRequest.url.includes("/auth/refresh-token")
    ) {
      originalRequest._retry = true;

      try {
        const res = await http.post("/auth/refresh-token");
        const newAccessToken = res.data.accessToken;
        saveAccessToken(newAccessToken);
        originalRequest.headers.Authorization =
            `Bearer ${newAccessToken}`;
        return http(originalRequest);

      } catch (err) {
        logout();
        window.location.href = "/tai-khoan/dang-nhap";
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default http;
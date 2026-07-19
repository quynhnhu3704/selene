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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

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
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return http(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await http.post("/auth/refresh-token");
        const newAccessToken = res.data.accessToken;
        saveAccessToken(newAccessToken);
        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;
        
        processQueue(null, newAccessToken);
        return http(originalRequest);

      } catch (err) {
        processQueue(err, null);
        logout();
        window.location.href = "/tai-khoan/dang-nhap";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default http;
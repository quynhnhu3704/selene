// frontend\src\services\http.js
import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

// interceptor (sau này thêm token)
http.interceptors.request.use((config) => {
  return config;
});

export default http;
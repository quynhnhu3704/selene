import { defineConfig, createLogger } from "vite";
import react from "@vitejs/plugin-react";

const logger = createLogger();
const originalLoggerError = logger.error;
logger.error = (msg, options) => {
  // Bỏ qua lỗi ngắt kết nối WebSocket vô hại khi refresh trình duyệt hoặc đóng socket trên Windows
  if (
    options?.error?.code === "ECONNABORTED" ||
    options?.error?.code === "ECONNRESET" ||
    options?.error?.code === "EPIPE" ||
    (typeof msg === "string" && (msg.includes("ECONNABORTED") || msg.includes("ECONNRESET")))
  ) {
    return;
  }
  originalLoggerError(msg, options);
};

// https://vite.dev/config/
export default defineConfig({
  customLogger: logger,
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true, ws: true },
    },
  },
});

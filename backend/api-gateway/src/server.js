// backend\api-gateway\src\server.js
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import cookieParser from "cookie-parser";
import { createAuthProxy } from "./auth-proxy.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(morgan("dev")); // Logging
app.use(cookieParser()); // Kích hoạt middleware đọc Cookie

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// Check required env vars
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL;

if (!AUTH_SERVICE_URL || !ORDER_SERVICE_URL) {
  console.error(
    "Missing required environment variables (AUTH_SERVICE_URL, ORDER_SERVICE_URL).",
  );
  process.exit(1);
}

// Routes - API Gateway
app.use(
  "/api/auth",
  createAuthProxy({
    target: AUTH_SERVICE_URL,
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);

app.use(
  "/api/products",
  createProxyMiddleware({
    target: PRODUCT_SERVICE_URL,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error("Proxy Error (Product):", err);
      res
        .status(502)
        .json({ success: false, message: "Product Service Unavailable" });
    },
  }),
);

// Chuyển chatbot đến product-service, có thể đổi target sang agent-service sau này.
app.use(
  "/api/chatbot",
  createProxyMiddleware({
    target: PRODUCT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/chatbot${path === "/" ? "" : path}`,
    proxyTimeout: 30000,
    on: {
      error: (err, req, res) => {
        console.error("Proxy Error (Chatbot):", err.message);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: 502,
          message: "Trợ lý ảo Selene đang tạm thời không hoạt động.",
        }));
      },
    },
  }),
);

app.use(
  "/api/orders",
  createProxyMiddleware({
    target: ORDER_SERVICE_URL,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error("Proxy Error (Order):", err);
      res
        .status(502)
        .json({ success: false, message: "Order Service Unavailable" });
    },
  }),
);

// Health Check Endpoint
app.get("/health", async (req, res) => {
  const healthStatus = {
    gateway: "UP",
    auth: "DOWN",
    order: "DOWN",
  };

  try {
    const authRes = await axios.get(`${AUTH_SERVICE_URL}/health`, {
      timeout: 2000,
    });
    if (authRes.data.status === "UP") healthStatus.auth = "UP";
  } catch (error) {
    console.error("Auth service health check failed:", error.message);
  }

  try {
    const orderRes = await axios.get(`${ORDER_SERVICE_URL}/health`, {
      timeout: 2000,
    });
    if (orderRes.data.status === "UP") healthStatus.order = "UP";
  } catch (error) {
    console.error("Order service health check failed:", error.message);
  }

  res.json(healthStatus);
});

// Centralized Error Handling for Gateway
app.use((err, req, res, next) => {
  console.error("Gateway Error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Gateway Error",
  });
});

app.listen(PORT, () => {
  console.log(`Gateway Service running on port ${PORT}`);
  console.log(`Routing /api/auth to ${AUTH_SERVICE_URL}`);
  console.log(`Routing /api/products to ${PRODUCT_SERVICE_URL}`);
  console.log(`Routing /api/orders to ${ORDER_SERVICE_URL}`);
});

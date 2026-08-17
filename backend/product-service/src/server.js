// backend\product-service\src\server.js
import express from "express";
import morgan from "morgan";
import cors from "cors";
import { config } from "./configs/index.js";
import productRoutes from "./routes/product.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { connectRabbitMQ } from "./configs/rabbitmq.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/", productRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.json({ service: "product", status: "UP" });
});

// Error Handling
app.use(errorHandler);

app.listen(config.port, async () => {
  console.log(`Product Service running on port ${config.port}`);
  await connectRabbitMQ();
});

import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import morgan from "morgan";
import { config } from "./configs/index.js";
import chatRoutes from "./routes/chat.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { createChatSocket } from "./socket.js";

const app = express();
const server = createServer(app);
app.set("io", createChatSocket(server));
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({ limit: "16kb" }));
app.use(morgan("dev"));
app.get("/health", (req, res) => res.json({ service: "chat", status: "UP" }));
app.use("/", chatRoutes);
app.use(errorHandler);
server.listen(config.port, () => console.log(`Chat Service running on port ${config.port}`));

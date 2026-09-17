import express from "express";
import * as chatbotController from "../controllers/chatbot.controller.js";

const router = express.Router();

// Nhận câu hỏi công khai của khách hàng qua API Gateway.
router.post("/", chatbotController.handleSendChatbotMessage);

export default router;

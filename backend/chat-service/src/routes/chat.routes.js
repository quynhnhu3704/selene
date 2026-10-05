import { Router } from "express";
import { verifyToken, verifyPermission } from "../middlewares/auth.middleware.js";
import {
  getConversations,
  getConversationDetails,
  getMyMessages,
} from "../controllers/conversation.controller.js";

const router = Router();

router.use(verifyToken);

// 1. Lấy danh sách cuộc trò chuyện quản lý (Admin / Staff với quyền 'chat:view')
router.get("/manage/conversations", verifyPermission("chat:view"), getConversations);

// 2. Lấy danh sách 10 tin nhắn theo ID cuộc hội thoại ỗ trợ cho admin / staff
router.get(
  "/manage/conversations/:conversationId/messages",
  verifyPermission("chat:view"),
  getConversationDetails
);

// 3. Lấy danh sách 10 tin nhắn theo ID cuộc hội thoại ỗ trợ cho custoomer
router.get("/my-conversation/messages", getMyMessages);

export default router;



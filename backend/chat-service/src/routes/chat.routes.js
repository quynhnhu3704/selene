import { Router } from "express";
import { verifyToken, verifyPermission } from "../middlewares/auth.middleware.js";
import {
  getConversations,
  getConversationDetails,
} from "../controllers/conversation.controller.js";

const router = Router();

router.use(verifyToken);

// Lấy danh sách cuộc trò chuyện quản lý (Yêu cầu quyền 'chat:view')
router.get("/manage/conversations", verifyPermission("chat:view"), getConversations);

// Lấy danh sách tin nhắn
router.get("/manage/conversations/:conversationId/messages", verifyPermission("chat:view"), getConversationDetails);




export default router;


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

// Lấy danh sách 10 tin nhắn mới nhất kèm thông tin khách hàng và 3 đơn hàng gần đây (trong 2 tháng) theo ID cuộc hội thoại (conversationId)
router.get("/manage/conversations/:conversationId", verifyPermission("chat:view"), getConversationDetails);
router.get("/manage/conversations/:conversationId/messages", verifyPermission("chat:view"), getConversationDetails);




export default router;


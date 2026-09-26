import { Router } from "express";
import {
  verifyToken,
  verifyPermission,
} from "../middlewares/auth.middleware.js";
import { getConversations } from "../controllers/conversation.controller.js";

const router = Router();

router.use(verifyToken);

// Lấy danh sách cuộc trò chuyện quản lý (Yêu cầu quyền 'chat:view')
router.get(
  "/manage/conversations",
  verifyPermission("chat:view"),
  getConversations,
);

export default router;

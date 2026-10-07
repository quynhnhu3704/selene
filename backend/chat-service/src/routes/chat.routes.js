import { Router } from "express";
import { verifyToken, verifyPermission } from "../middlewares/auth.middleware.js";
import { chatUpload } from "../middlewares/upload.middleware.js";
import {
  getConversations,
  getConversationDetails,
  getMyMessages,
  sendTextMessage,
  sendAttachmentMessage,
} from "../controllers/conversation.controller.js";

const router = Router();

router.use(verifyToken);

// =========================================================
// CÁC ROUTE LẤY DANH SÁCH & CHI TIẾT TIN NHẮN
// =========================================================

// 1. Lấy danh sách cuộc trò chuyện quản lý (Admin / Staff với quyền 'chat:view')
router.get("/manage/conversations", verifyPermission("chat:view"), getConversations);

// 2. Lấy danh sách 10 tin nhắn theo ID cuộc hội thoại hỗ trợ cho admin / staff
router.get(
  "/manage/conversations/:conversationId/messages",
  verifyPermission("chat:view"),
  getConversationDetails
);

// 3. Lấy danh sách 10 tin nhắn theo ID cuộc hội thoại hỗ trợ cho customer
router.get("/my-conversation/messages", getMyMessages);

// 4. Gửi 1 tin nhắn loại text (dùng chung, tự động tạo cuộc hội thoại nếu chưa có)
router.post("/messages/text", sendTextMessage);

// =========================================================
// ROUTE GỬI HÌNH ẢNH, VIDEO, TỆP ĐÍNH KÈM
// =========================================================

// 5. Gửi tin nhắn đính kèm file/hình ảnh/video trực tiếp (multipart/form-data)
router.post("/messages/attachment", chatUpload.any(), sendAttachmentMessage);

export default router;

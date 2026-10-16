import { Router } from "express";
import { verifyToken, verifyPermission } from "../middlewares/auth.middleware.js";
import { chatUpload } from "../middlewares/upload.middleware.js";
import {
  getConversations,
  getConversationDetails,
  getMyMessages,
  sendTextMessage,
  sendAttachmentMessage,
  replyMessage,
  assignConversation,
  closeConversation,
} from "../controllers/conversation.controller.js";
import {
  reactToMessage,
  removeReaction,
  getMessageReactions,
} from "../controllers/reaction.controller.js";

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

// =========================================================
// ROUTE TRẢ LỜI (REPLY) TIN NHẮN
// =========================================================

// 6. Trả lời một tin nhắn cụ thể (hỗ trợ text, emoji và file/ảnh đính kèm)
router.post("/messages/:messageId/reply", chatUpload.any(), replyMessage);

// =========================================================
// ROUTE REACTION (BIỂU CẢM) TIN NHẮN
// =========================================================

// 7. Thả / Thay đổi / Bật tắt reaction cho tin nhắn
router.post("/messages/:messageId/reaction", reactToMessage);

// 8. Hủy reaction của người dùng trên tin nhắn
router.delete("/messages/:messageId/reaction", removeReaction);

// 9. Lấy danh sách các reaction của một tin nhắn
router.get("/messages/:messageId/reaction", getMessageReactions);

// =========================================================
// CÁC ROUTE QUẢN LÝ TIẾP NHẬN / TRẠNG THÁI HỘI THOẠI
// =========================================================

// 6. Nhận xử lý cuộc trò chuyện (Admin / Staff với quyền 'chat:assign')
router.put(
  "/manage/conversations/:conversationId/assign",
  verifyPermission("chat:assign"),
  assignConversation
);

// 7. Đóng cuộc trò chuyện (Admin / Staff với quyền 'chat:close')
router.put(
  "/manage/conversations/:conversationId/close",
  verifyPermission("chat:close"),
  closeConversation
);

export default router;


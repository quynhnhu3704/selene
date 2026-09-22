import { Router } from "express";
import { verifyToken, verifyPermission } from "../middlewares/auth.middleware.js";
import * as conversationController from "../controllers/conversation.controller.js";
import * as messageController from "../controllers/message.controller.js";

const router = Router();
router.use(verifyToken);
router.get("/session", (req, res) => res.json({ status: 200, data: req.user }));
router.get("/conversations/me", conversationController.getMine);
router.post("/conversations", conversationController.createConversation);
router.get("/conversations/:id/messages", messageController.getMessages);
router.post("/conversations/:id/messages", messageController.sendMessage);
router.put("/conversations/:id/read", messageController.readMessages);
router.get("/admin/conversations", verifyPermission("chat:view"), conversationController.getConversations);
router.get("/admin/conversations/:id", verifyPermission("chat:view"), conversationController.getConversation);
router.put("/admin/conversations/:id/assign", verifyPermission("chat:assign"), conversationController.assignConversation);
router.put("/admin/conversations/:id/close", verifyPermission("chat:close"), conversationController.closeConversation);
export default router;

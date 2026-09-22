import { MessageService } from "../services/message.service.js";
import { ConversationService } from "../services/conversation.service.js";
import { emitConversation, notifyConversation } from "../socket.js";

export const getMessages = async (req, res, next) => {
  try { res.json({ status: 200, data: await MessageService.getMessages(req.user, req.params.id, req.query) }); }
  catch (error) { next(error); }
};

export const sendMessage = async (req, res, next) => {
  try {
    const data = await MessageService.send(req.user, req.params.id, req.body);
    const conversation = await ConversationService.getAccessible(req.user, req.params.id);
    const io = req.app.get("io");
    notifyConversation(io, conversation);
    await emitConversation(io, conversation, "message:new", data);
    res.status(201).json({ status: 201, data });
  } catch (error) { next(error); }
};

export const readMessages = async (req, res, next) => {
  try {
    const data = await MessageService.read(req.user, req.params.id, req.body?.through_id);
    if (data.length) {
      const conversation = await ConversationService.getAccessible(req.user, req.params.id);
      const io = req.app.get("io");
      await emitConversation(io, conversation, "message:read", { conversation_id: req.params.id, message_ids: data });
      notifyConversation(io, conversation);
    }
    res.json({ status: 200, data });
  } catch (error) { next(error); }
};

import { ConversationService } from "../services/conversation.service.js";
import { notifyConversation } from "../socket.js";

export const getMine = async (req, res, next) => {
  try { res.json({ status: 200, data: await ConversationService.getMine(req.user) }); }
  catch (error) { next(error); }
};

export const createConversation = async (req, res, next) => {
  try {
    const data = await ConversationService.create(req.user);
    notifyConversation(req.app.get("io"), data);
    res.status(201).json({ status: 201, data });
  } catch (error) { next(error); }
};

export const getConversations = async (req, res, next) => {
  try {
    const result = await ConversationService.getAll(req.user, req.query);
    res.json({ status: 200, data: result.conversations, waitingCount: result.waitingCount,
      pagination: { currentPage: result.page, limit: result.limit, totalItems: result.totalItems } });
  } catch (error) { next(error); }
};

export const getConversation = async (req, res, next) => {
  try { res.json({ status: 200, data: await ConversationService.getDetail(req.user, req.params.id) }); }
  catch (error) { next(error); }
};

export const assignConversation = async (req, res, next) => {
  try {
    const data = await ConversationService.assign(req.user, req.params.id);
    notifyConversation(req.app.get("io"), data);
    res.json({ status: 200, data });
  } catch (error) { next(error); }
};

export const closeConversation = async (req, res, next) => {
  try {
    const data = await ConversationService.close(req.user, req.params.id);
    notifyConversation(req.app.get("io"), data);
    res.json({ status: 200, data });
  } catch (error) { next(error); }
};

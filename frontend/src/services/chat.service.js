import http from "./http";

export const getChatSession = () => http.get("/chat/session");
export const getMyConversations = () => http.get("/chat/conversations/me");
export const createConversation = () => http.post("/chat/conversations");
export const getConversations = (params) => http.get("/chat/admin/conversations", { params });
export const getConversation = (id) => http.get(`/chat/admin/conversations/${id}`);
export const assignConversation = (id) => http.put(`/chat/admin/conversations/${id}/assign`);
export const closeConversation = (id) => http.put(`/chat/admin/conversations/${id}/close`);
export const getMessages = (id, params) => http.get(`/chat/conversations/${id}/messages`, { params });
export const sendMessage = (id, data) => http.post(`/chat/conversations/${id}/messages`, data);
export const readMessages = (id, throughId) => http.put(`/chat/conversations/${id}/read`, { through_id: throughId });

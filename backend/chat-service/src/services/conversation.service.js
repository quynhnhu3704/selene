import { ConversationModel } from "../models/conversation.model.js";
import { getCustomerOrders } from "./order.service.js";

export const hasPermission = (user, permission) =>
  user.role === "admin" || (user.role === "staff" && user.permissions.includes(permission));

export const requirePermission = (user, permission) => {
  if (!hasPermission(user, permission)) throw { status: 403, message: "Bạn không có quyền thực hiện thao tác này!" };
};

export const getChatUser = async (accountId) => {
  const account = await ConversationModel.findAccount(accountId);
  if (!account || account.status !== "active" || account.roles?.status !== "active") {
    throw { status: 403, message: "Tài khoản hoặc vai trò đã bị khóa!" };
  }
  return {
    accountId: account.account_id,
    role: ({ 1: "admin", 2: "staff", 3: "customer" })[account.role_id],
    permissions: (account.roles?.role_permissions || [])
      .filter((item) => item.permissions?.status === "active").map((item) => item.permissions.name),
  };
};

export const ConversationService = {
  getAccessible: async (user, id) => {
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw { status: 400, message: "Mã hội thoại không hợp lệ!" };
    }
    const conversation = await ConversationModel.findById(id);
    if (!conversation) throw { status: 404, message: "Không tìm thấy hội thoại!" };
    if (user.role === "customer") {
      if (conversation.customer_id !== user.accountId) throw { status: 403, message: "Bạn không được truy cập hội thoại này!" };
    } else requirePermission(user, "chat:view");
    return conversation;
  },

  getMine: async (user) => {
    if (user.role !== "customer") throw { status: 403, message: "Chỉ khách hàng được mở yêu cầu hỗ trợ!" };
    return ConversationModel.findByCustomer(user.accountId);
  },

  create: async (user) => {
    const conversations = await ConversationService.getMine(user);
    const current = conversations.find((item) => item.status !== "closed");
    if (current) return current;
    try {
      return await ConversationModel.create(user.accountId);
    } catch (error) {
      if (error.code !== "23505") throw error;
      const latest = await ConversationService.getMine(user);
      const open = latest.find((item) => item.status !== "closed");
      if (!open) throw error;
      return open;
    }
  },

  getAll: async (user, { status, page = 1, limit = 30 }) => {
    requirePermission(user, "chat:view");
    page = Number(page);
    limit = Number(limit);
    if ((status && !["waiting", "active", "closed"].includes(status)) ||
      !Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw { status: 400, message: "Bộ lọc hoặc phân trang không hợp lệ!" };
    }
    const [result, waitingCount] = await Promise.all([
      ConversationModel.findAll(status, page, limit), ConversationModel.countWaiting(),
    ]);
    return { ...result, waitingCount, page, limit };
  },

  getDetail: async (user, id) => {
    requirePermission(user, "chat:view");
    const conversation = await ConversationService.getAccessible(user, id);
    const customer = await ConversationModel.getCustomerInfo(conversation.customer_id);
    try { customer.orders = await getCustomerOrders(conversation.customer_id); }
    catch { customer.orders = []; customer.orders_error = "Tạm thời không tải được đơn hàng. Vui lòng thử lại."; }
    return { ...conversation, customer };
  },

  assign: async (user, id) => {
    requirePermission(user, "chat:assign");
    await ConversationService.getAccessible(user, id);
    const conversation = await ConversationModel.assign(id, user.accountId);
    if (!conversation) throw { status: 409, message: "Hội thoại đã được nhận hoặc đã đóng!" };
    return conversation;
  },

  close: async (user, id) => {
    requirePermission(user, "chat:close");
    await ConversationService.getAccessible(user, id);
    const conversation = await ConversationModel.close(id, user.accountId, user.role === "admin");
    if (!conversation) throw { status: 409, message: "Chỉ nhân viên phụ trách được đóng hội thoại đang mở!" };
    return conversation;
  },
};

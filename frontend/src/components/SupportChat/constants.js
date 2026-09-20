export const STATUS_LABELS = { waiting: "Chờ hỗ trợ", active: "Đang xử lý", closed: "Đã đóng" };
export const canChat = (user, permission) => user?.role === "admin" ||
  (user?.role === "staff" && user.permissions?.includes(permission));

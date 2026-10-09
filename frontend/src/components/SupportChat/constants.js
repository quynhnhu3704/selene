export const STATUS_LABELS = {
  waiting: "Chờ hỗ trợ",
  pending: "Chờ hỗ trợ",
  active: "Đang xử lý",
  processing: "Đang xử lý",
  open: "Đang xử lý",
  closed: "Đã đóng",
};

export const STATUS_CLASSES = {
  waiting: "waiting",
  pending: "waiting",
  active: "active",
  processing: "active",
  open: "active",
  closed: "closed",
};

export const getStatusLabel = (status) => STATUS_LABELS[status] || status || "Chờ hỗ trợ";

export const getStatusClass = (status) => STATUS_CLASSES[status] || "waiting";

export const STATUS_FILTERS = [
  { key: "all", label: "Tất cả", icon: "bi-chat-dots" },
  { key: "waiting", label: "Chờ hỗ trợ", icon: "bi-clock-history" },
  { key: "processing", label: "Đang xử lý", icon: "bi-arrow-repeat" },
  { key: "closed", label: "Đã đóng", icon: "bi-check2-circle" },
];

export const canChat = (user, permission) =>
  user?.role === "admin" ||
  user?.role === "staff" ||
  (Array.isArray(user?.permissions) && user.permissions.includes(permission));


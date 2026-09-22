export const ROLE_LABELS = {
  1: "Chủ cửa hàng",
  2: "Nhân viên",
  3: "Khách hàng",
};

export const GROUP_LABELS = {
  chat: "Chăm sóc khách hàng",
  user: "Tài khoản",
  profile: "Hồ sơ người dùng",
  role: "Vai trò",
  permission: "Quyền hệ thống",
  product: "Sản phẩm",
  category: "Danh mục",
  order: "Đơn hàng",
  dashboard: "Thống kê",
  cart: "Giỏ hàng",
  payment: "Thanh toán",
  review: "Đánh giá",
  inventory: "Kho hàng",
  brand: "Thương hiệu",
  variant: "Biến thể sản phẩm",
  promotion: "Khuyến mãi",
  voucher: "Mã giảm giá",
};

export const ACTION_LABELS = {
  reply: "Trả lời",
  assign: "Nhận xử lý",
  close: "Đóng",
  view: "Xem",
  read: "Xem",
  create: "Thêm mới",
  update: "Cập nhật",
  delete: "Xóa",
  export: "Xuất dữ liệu",
  manage: "Quản lý",
  add: "Thêm",
  approve: "Duyệt",
  cancel: "Hủy",
  complete: "Hoàn thành",
  ship: "Giao hàng",
};

export const permissionLabel = (permission) => {
  const [group, action] = permission.name.split(":");
  return (
    permission.description ||
    (ACTION_LABELS[action] && GROUP_LABELS[group]
      ? `${ACTION_LABELS[action]} ${GROUP_LABELS[group].toLowerCase()}`
      : permission.name)
  );
};

export const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

export const permissionKey = (roleId, permissionId) =>
  `${roleId}/${permissionId}`;

export const matrixSelection = (roles) =>
  new Set(
    roles.flatMap((role) =>
      (role.role_permissions || []).map((permission) =>
        permissionKey(role.role_id, permission.permission_id),
      ),
    ),
  );

// Vai trò tài khoản được xác định bằng role_id trong bảng accounts.
export const ROLE_IDS = {
  admin: 1,
  staff: 2,
  customer: 3,
};

export const getRoleName = (roleId) => {
  return Object.keys(ROLE_IDS).find((role) => ROLE_IDS[role] === Number(roleId)) || null;
};

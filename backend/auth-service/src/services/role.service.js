// backend/auth-service/src/services/role.service.js
import { RoleModel } from "../models/role.model.js";
import { AccountModel } from "../models/account.model.js";
import { UserProfileModel } from "../models/userProfile.model.js";

export const toggleRoleStatus = async (roleId) => {
  // 1. Kiểm tra vai trò có tồn tại hay không
  const role = await RoleModel.findById(roleId);
  if (!role) {
    throw { status: 404, message: "Vai trò không tồn tại trên hệ thống!" };
  }

  // 2. Chuyển đổi trạng thái (active <-> inactive)
  const currentStatus = role.status || "active";
  const newStatus = currentStatus === "active" ? "inactive" : "active";

  // 3. Cập nhật trạng thái của vai trò
  const updatedRole = await RoleModel.updateRoleStatus(roleId, newStatus);

  // 4. Tìm các tài khoản thuộc vai trò này để đồng bộ trạng thái
  const accounts = await AccountModel.findAccountsByRoleId(roleId);
  if (accounts && accounts.length > 0) {
    const accountIds = accounts.map((acc) => acc.account_id);

    // Cập nhật trạng thái accounts
    await AccountModel.updateAccountsStatusByRoleId(roleId, newStatus);

    // Cập nhật trạng thái user_profiles tương ứng
    await UserProfileModel.updateUserProfilesStatusByAccountIds(accountIds, newStatus);
  }

  return updatedRole;
};

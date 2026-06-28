import { PermissionModel } from '../models/permission.model.js';
import { AccountModel } from '../models/account.model.js';


// lấy tất cả các quyền hiện có
export const getAllSystemPermissions = async () => {
  const permissions = await PermissionModel.getAllPermissions();
  
  return {
    total: permissions.length,
    permissions: permissions
  };
};


// lấy quuyeenf theo accountId
export const getPermissionsByAccountId = async (accountId) => {
  // 1. Kiểm tra tài khoản có tồn tại hay không
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new Error('Tài khoản không tồn tại trên hệ thống!');
  }

  // 2. Gọi đúng hàm từ PermissionModel đã sửa ở trên
  const permissions = await PermissionModel.getPermissionsByAccountId(accountId);
  
  // 3. Trả kết quả đã xử lý về cho Controller
  return {
    account_id: accountId,
    role_name: account.role_name,
    permissions: permissions
  };
};
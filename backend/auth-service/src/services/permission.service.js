// backend\auth-service\src\services\permission.service.js
import { PermissionModel } from "../models/permission.model.js";
import { AccountModel } from "../models/account.model.js";

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

// lấy tất cả các quyền hiện có
export const getAllSystemPermissions = async () => {
  const permissions = await PermissionModel.getAllPermissions();

  return {
    total: permissions.length,
    permissions: permissions,
  };
};

// lấy quuyeenf theo accountId
export const getPermissionsByAccountId = async (accountId) => {
  // 1. Kiểm tra tài khoản có tồn tại hay không
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new Error("Tài khoản không tồn tại trên hệ thống!");
  }

  // 2. Gọi đúng hàm từ PermissionModel đã sửa ở trên
  const permissions =
    await PermissionModel.getPermissionsByAccountId(accountId);

  // 3. Trả kết quả đã xử lý về cho Controller
  return {
    account_id: accountId,
    role_name: account.role_name,
    permissions: permissions,
  };
};

// thêm quyền mới
export const createNewPermission = async (body) => {
  const { name, description, status } = body;

  // 1. Validate dữ liệu đầu vào bắt buộc
  if (!name) {
    throw { status: 400, message: "Tên quyền (name) là bắt buộc!" };
  }

  // Chuẩn hóa tên quyền (ví dụ: biến thành chữ thường, xóa khoảng trắng thừa)
  const formatName = name.trim().toLowerCase();

  // 2. Kiểm tra trùng lặp tên quyền
  const existingPermission =
    await PermissionModel.getPermissionByName(formatName);
  if (existingPermission) {
    throw {
      status: 409,
      message: `Quyền '${formatName}' đã tồn tại trong hệ thống!`,
    };
  }

  // 3. Chuẩn bị data để insert
  const permissionId = "per-" + generateId();

  const newPermissionData = {
    permission_id: permissionId,
    name: formatName,
    description: description || null,
    status: status || "active",
    created_at: new Date().toISOString(),
  };

  // 4. Gọi Model để lưu vào database
  const createdPermission =
    await PermissionModel.createPermission(newPermissionData);

  return createdPermission;
};

// cập nhật quyền
export const updatePermission = async (permissionId, body) => {
  const { name, description, status } = body;

  // 1. Kiểm tra quyền cần sửa có tồn tại trong hệ thống không
  const currentPermission =
    await PermissionModel.getPermissionById(permissionId);
  if (!currentPermission) {
    throw { status: 404, message: "Không tìm thấy quyền hạn cần cập nhật!" };
  }

  // 2. Tạo object dữ liệu mặc định kế thừa hoàn toàn từ bản ghi cũ
  const updateData = {
    name: currentPermission.name,
    description:
      description !== undefined ? description : currentPermission.description,
    status: status !== undefined ? status : currentPermission.status,
  };

  // 3. Xử lý logic thay đổi tên (name)
  if (name) {
    const formatName = name.trim().toLowerCase();

    // CHỈ KIỂM TRA TRÙNG LẶP nếu tên gửi lên KHÁC với tên hiện tại của chính nó
    if (formatName !== currentPermission.name) {
      const existingPermission =
        await PermissionModel.getPermissionByName(formatName);

      // Nếu tìm thấy một bản ghi trùng tên VÀ bản ghi đó thuộc về một ID KHÁC
      if (
        existingPermission &&
        existingPermission.permission_id !== permissionId
      ) {
        throw {
          status: 409,
          message: `Tên quyền '${formatName}' đã được sử dụng bởi một bản ghi khác!`,
        };
      }
    }

    // Nếu trùng với tên cũ của chính nó, gán lại và bỏ qua bước check trùng
    updateData.name = formatName;
  }

  // 4. Tiến hành gọi Model cập nhật database
  const updatedPermission = await PermissionModel.updatePermission(
    permissionId,
    updateData,
  );

  return updatedPermission;
};

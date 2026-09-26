// backend\auth-service\src\services\permission.service.js
import { PermissionModel } from "../models/permission.model.js";
import { AccountModel } from "../models/account.model.js";
import { getRoleName } from "../configs/roles.js";
import { RoleModel } from "../models/role.model.js";

// Kiểm tra trực tiếp tài khoản để quyền quản trị không phụ thuộc token cũ.
const requirePermissionManager = async (accountId) => {
  const account = await AccountModel.findById(accountId);
  if (
    !account ||
    account.status !== "active" ||
    Number(account.role_id) !== 1
  ) {
    throw { status: 403, message: "Chỉ chủ cửa hàng được quản lý phân quyền!" };
  }
};

export const getPermissionMatrix = async (accountId) => {
  await requirePermissionManager(accountId);
  return PermissionModel.getPermissionMatrix();
};

export const setRolePermission = async (
  accountId,
  roleId,
  permissionId,
  enabled,
) => {
  await requirePermissionManager(accountId);
  const id = Number(roleId);
  if (!Number.isInteger(id) || id <= 0 || typeof enabled !== "boolean") {
    throw { status: 400, message: "Dữ liệu phân quyền không hợp lệ!" };
  }
  if (id === 1) {
    throw {
      status: 400,
      message: "Không thể thay đổi quyền của chủ cửa hàng!",
    };
  }
  const [role, permission] = await Promise.all([
    RoleModel.findById(id),
    PermissionModel.getPermissionById(permissionId),
  ]);
  if (!role || !permission) {
    throw { status: 404, message: "Vai trò hoặc quyền không tồn tại!" };
  }
  if (role.status !== "active" || (enabled && permission.status !== "active")) {
    throw {
      status: 400,
      message:
        "Không thể cấp quyền đã ngừng hoạt động hoặc sửa vai trò đã khóa!",
    };
  }
  await PermissionModel.setRolePermission(id, permissionId, enabled);
  return { role_id: id, permission_id: permissionId, enabled };
};

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
    role_name: getRoleName(account.role_id),
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

// chuyển đổi trạng thái (toggle active <-> inactive) của permission
export const togglePermissionStatus = async (permissionId) => {
  // 1. Kiểm tra quyền có tồn tại hay không
  const permission = await PermissionModel.getPermissionById(permissionId);
  if (!permission) {
    throw { status: 404, message: "Không tìm thấy quyền hạn cần cập nhật!" };
  }

  // 2. Chuyển đổi trạng thái (active <-> inactive)
  const currentStatus = permission.status || "active";
  const newStatus = currentStatus === "active" ? "inactive" : "active";

  // 3. Tiến hành gọi Model cập nhật database
  const updatedPermission = await PermissionModel.updatePermissionStatus(
    permissionId,
    newStatus,
  );

  return updatedPermission;
};

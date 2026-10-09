// backend\auth-service\src\models\permission.model.js
import { supabase } from "../configs/supabase.js";

export const PermissionModel = {
  getPermissionMatrix: async () => {
    const [permissions, roles] = await Promise.all([
      supabase
        .from("permissions")
        .select("permission_id, name, description, status")
        .order("name"),
      supabase
        .from("roles")
        .select("role_id, name, status, role_permissions(permission_id)")
        .order("role_id"),
    ]);
    if (permissions.error) throw permissions.error;
    if (roles.error) throw roles.error;
    return { permissions: permissions.data, roles: roles.data };
  },

  setRolePermission: async (roleId, permissionId, enabled) => {
    if (!enabled) {
      const { error } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId)
        .eq("permission_id", permissionId);
      if (error) throw error;
      return;
    }
    const { error: insertError } = await supabase
      .from("role_permissions")
      .upsert(
        { role_id: roleId, permission_id: permissionId },
        {
          onConflict: "role_id,permission_id",
          ignoreDuplicates: true,
        },
      );
    if (insertError) throw insertError;
  },

  // Lấy danh sách tất cả các quyền hiện có trong hệ thống
  getAllPermissions: async () => {
    const { data, error } = await supabase.from("permissions").select("name");

    if (error) throw error;

    return data ? data.map((p) => p.name) : [];
  },

  // lấy quyền theo accountID
  getPermissionsByAccountId: async (accountId) => {
    const { data, error } = await supabase
      .from("accounts")
      .select(
        `
                 roles (
                   role_permissions (
                     permissions (name)
                   )
                 )
             `,
      )
      .eq("account_id", accountId)
      .single();

    if (error) throw error;

    // Trả về mảng rỗng nếu không có dữ liệu quyền
    if (!data || !data.roles || !data.roles.role_permissions) return [];

    // Khử mảng lồng nhau thành mảng phẳng chứa string tên quyền
    return data.roles.role_permissions
      .map((rp) => rp.permissions?.name)
      .filter(Boolean);
  },

  // Kiểm tra quyền đã tồn tại bằng name
  getPermissionByName: async (name) => {
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .eq("name", name);

    if (error) throw error;
    return data.length > 0 ? data[0] : null;
  },

  // Chèn permission mới vào database
  createPermission: async (permissionData) => {
    const { data, error } = await supabase
      .from("permissions")
      .insert([
        {
          permission_id: permissionData.permission_id,
          name: permissionData.name,
          description: permissionData.description,
          status: permissionData.status || "active",
          created_at: permissionData.created_at,
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Tìm permission theo ID
  getPermissionById: async (permissionId) => {
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .eq("permission_id", permissionId);

    if (error) throw error;
    return data.length > 0 ? data[0] : null;
  },

  // Cập nhật dữ liệu permission vào database
  updatePermission: async (permissionId, updateData) => {
    const { data, error } = await supabase
      .from("permissions")
      .update({
        name: updateData.name,
        description: updateData.description,
        status: updateData.status,
      })
      .eq("permission_id", permissionId)
      .select(); // Trả về bản ghi sau khi cập nhật thành công

    if (error) throw error;
    return data[0];
  },

  // Cập nhật trạng thái của permission
  updatePermissionStatus: async (permissionId, status) => {
    const { data, error } = await supabase
      .from("permissions")
      .update({
        status,
      })
      .eq("permission_id", permissionId)
      .select(); // Trả về bản ghi sau khi cập nhật thành công

    if (error) throw error;
    return data[0];
  },
};

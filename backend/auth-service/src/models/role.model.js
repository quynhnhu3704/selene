// backend/auth-service/src/models/role.model.js
import { supabase } from "../configs/supabase.js";

export const RoleModel = {
  // Tìm vai trò theo ID
  findById: async (roleId) => {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .eq("role_id", roleId)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  // Cập nhật trạng thái của vai trò
  updateRoleStatus: async (roleId, status) => {
    const { data, error } = await supabase
      .from("roles")
      .update({
        status,
        updated_at: new Date(),
      })
      .eq("role_id", roleId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

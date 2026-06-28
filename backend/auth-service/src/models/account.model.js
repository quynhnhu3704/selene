import { supabase } from '../configs/supabase.js';

export const AccountModel = {
  // Tìm tài khoản theo email hoặc số điện thoại
  findByEmailOrPhone: async (email, phone) => {
    const { data } = await supabase
      .from('accounts')
      .select('account_id')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .single();
    return data;
  },

  // Tìm tài khoản theo Email
  findByEmail: async (email) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('email', email)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // Bỏ qua lỗi không tìm thấy dòng nào
    return data;
  },

  // Tìm tài khoản theo ID
  findById: async (accountId) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('account_id', accountId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Tìm vai trò (Role) theo tên
  findRoleByName: async (roleName) => {
    const { data } = await supabase
      .from('roles')
      .select('role_id')
      .eq('name', roleName)
      .single();
    return data;
  },

  // Lấy danh sách quyền hạn dựa theo role_id
  getPermissionsByRoleId: async (roleId) => {
    const { data } = await supabase
      .from('role_permissions')
      .select('permissions(name)')
      .eq('role_id', roleId);
    return data ? data.map(p => p.permissions?.name).filter(Boolean) : [];
  },

  // Thêm mới tài khoản
  createAccount: async (accountData) => {
    const { data, error } = await supabase
      .from('accounts')
      .insert([accountData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Tạo mới hồ sơ người dùng
  createProfile: async (profileData) => {
    const { error } = await supabase
      .from('user_profiles')
      .insert([profileData]);
    if (error) throw error;
    return true;
  },

  // Cập nhật thông tin tài khoản (Ví dụ: mật khẩu)
  updateAccount: async (email, updateData) => {
    const { error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('email', email);
    if (error) throw error;
    return true;
  }
};
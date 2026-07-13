// backend\auth-service\src\models\account.model.js
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
    // Bước 1: Lấy các permission_id từ bảng role_permissions
    const { data: rolePerms, error: rpError } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', roleId);

    if (rpError) {
      console.error("Lỗi lấy role_permissions:", rpError);
      return [];
    }

    if (!rolePerms || rolePerms.length === 0) {
      return [];
    }

    const permissionIds = rolePerms.map(rp => rp.permission_id);

    // Bước 2: Lấy tên quyền từ bảng permissions
    const { data: perms, error: pError } = await supabase
      .from('permissions')
      .select('name')
      .in('permission_id', permissionIds);

    if (pError) {
      console.error("Lỗi lấy bảng permissions:", pError);
      return [];
    }

    const finalPerms = perms ? perms.map(p => p.name) : [];
    return finalPerms;
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
  },

  // Đếm tổng số tài khoản hiện có trong bảng accounts
  countAccounts: async () => {
    const { count, error } = await supabase
      .from('accounts')
      .select('account_id', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  },

  // Lấy danh sách accounts theo khoảng phân trang
  getAccountsInRange: async (from, to) => {
    const { data, error } = await supabase
      .from('accounts')
      .select(`
      account_id,
      email,
      phone,
      role_name,
      status,
      created_at
    `)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return data || [];
  },

  // Thực thi thay đổi vào bảng accounts
  updateAccountById: async (accountId, accountData) => {
    const dataWithTime = {
      ...accountData,
      updated_at: new Date() // Tự động chèn thời gian cập nhật hiện tại
    };

    const { error } = await supabase
      .from('accounts')
      .update(dataWithTime)
      .eq('account_id', accountId);

    if (error) throw error;
  }
};
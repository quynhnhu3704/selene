import { supabase } from '../configs/supabase.js';

export const UserProfileModel = {
  // Xử lý upload ảnh lên Supabase Storage
  uploadAvatarFile: async (fileName, fileBuffer, contentType) => {
    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, fileBuffer, {
        contentType: contentType,
        upsert: true
      });
    if (error) throw error;

    // Lấy public URL
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  },

  // Xóa ảnh cũ trên Supabase Storage
  deleteAvatarFile: async (oldFileName) => {
    const { error } = await supabase.storage.from('avatars').remove([oldFileName]);
    return { error };
  },

  // Lấy hồ sơ tài khoản theo account_id
  getAccountById: async (accountId) => {
    const { data } = await supabase
      .from('accounts')
      .select('email, phone, status')
      .eq('account_id', accountId)
      .single();
    return data;
  },

  // LẤY GIÁ TRỊ BAN ĐẦU của profile theo account_id
  getProfileByAccountId: async (accountId) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('profile_id, full_name, phone_number, identity_card, avatar_url, gender, dob, address, status') 
      .eq('account_id', accountId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Kiểm tra trùng lặp dựa trên điều kiện tùy chọn
  checkDuplicate: async (table, column, value) => {
    const { data } = await supabase.from(table).select('*').eq(column, value).single();
    return data;
  },

  // Kiểm tra Email đã tồn tại chưa
  checkEmailExists: async (email) => {
    const { data } = await supabase.from('accounts').select('account_id').eq('email', email);
    return data;
  },

  // Kiểm tra Số điện thoại đã tồn tại chưa
  checkPhoneExists: async (phone) => {
    const { data } = await supabase.from('accounts').select('account_id').eq('phone', phone);
    return data;
  },

  // Tìm Role động từ DB để lấy đúng role_id
  findRoleByName: async (roleName) => {
    const { data, error } = await supabase
      .from('roles')
      .select('role_id, name')
      .eq('name', roleName)
      .single();
    if (error) throw error;
    return data;
  },

  // Đếm tổng số bản ghi hiện có trong DB trước bằng cơ chế head: true (tối ưu hóa tốc độ đếm)
  countProfiles: async () => {
    const { count, error } = await supabase
      .from('user_profiles')
      .select('profile_id', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  },

  // TIẾN HÀNH LẤY DỮ LIỆU theo range phân trang
  getProfilesInRange: async (from, to) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        profile_id,
        account_id,
        full_name,
        phone_number,
        identity_card,
        accounts (
          email,
          role_name,
          status
        )
      `)
      .order('profile_id', { ascending: true })
      .range(from, to);
    if (error) throw error;
    return data || [];
  },

  // lấy thông tin chi tiết hồ sơ kèm thông tin account liên kết
  getProfileDetailById: async (profileId) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        profile_id,
        full_name,
        phone_number,
        identity_card,
        avatar_url,
        gender,
        dob,
        address,
        status,
        accounts (
          email,
          role_name,
          status
        )
      `)
      .eq('profile_id', profileId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // BƯỚC 1: Tạo tài khoản trong bảng accounts trước
  insertAccount: async (accountData) => {
    const { error } = await supabase.from('accounts').insert([accountData]);
    if (error) throw error;
  },

  // BƯỚC 2: Tạo hồ sơ thông tin chi tiết trong bảng user_profiles
  insertProfile: async (profileData) => {
    const { error } = await supabase.from('user_profiles').insert([profileData]);
    if (error) throw error;
  },

  // Tiến hành cập nhật vào bảng user_profiles
  updateProfileByAccountId: async (accountId, updateData) => {
    const { error } = await supabase.from('user_profiles').update(updateData).eq('account_id', accountId);
    if (error) throw error;
  },

  // Thực thi thay đổi vào bảng accounts
  updateAccountById: async (accountId, accountData) => {
    const { error } = await supabase.from('accounts').update(accountData).eq('account_id', accountId);
    if (error) throw error;
  }
};
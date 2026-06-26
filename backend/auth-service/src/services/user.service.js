import { config } from '../configs/index.js';
import { supabase } from '../configs/supabase.js';
import bcrypt from 'bcrypt';


const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};


// xử lý ảnh
const uploadAvatar = async (prefix, identifier, avatarFile) => {
  if (!avatarFile) return null;

  // 1. Lấy phần mở rộng của file
  const fileExt = avatarFile.originalname.split('.').pop();
  
  // 2. Tạo tên file unique dựa trên prefix + identifier + timestamp
  const fileName = `avatar_${prefix}_${identifier}_${Date.now()}.${fileExt}`;

  // 3. Tiến hành upload lên bucket 'avatars'
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, avatarFile.buffer, {
      contentType: avatarFile.mimetype,
      upsert: true
    });

  if (uploadError) {
    console.error(`Lỗi Storage (${prefix}):`, uploadError.message);
    throw new Error('Lỗi trong quá trình tải ảnh đại diện lên hệ thống lưu trữ!');
  }

  // 4. Lấy public URL
  const { data: publicUrlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
};


// ================== CUSTOMER =====================

// cập nhật hồ sơ thông tin khách hàng
export const updateCustomerProfile = async (accountId, profileData, avatarFile) => {
  const { full_name, phone_number, gender, dob } = profileData;
  let avatarUrl = null;

  // 1. LẤY GIÁ TRỊ BAN ĐẦU: 
  const { data: existingProfile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('profile_id, full_name, phone_number, avatar_url, gender, dob') 
    .eq('account_id', accountId)
    .single();

  if (fetchError || !existingProfile) {
    throw new Error('Không tìm thấy hồ sơ người dùng hợp lệ!');
  }

  // 2. Xử lý tải ảnh lên Supabase Storage nếu có file mới được chọn
  if (avatarFile) {
    avatarUrl = await uploadAvatar('customer', accountId, avatarFile);
  }

  // 3. XỬ LÝ LOGIC ĐỘNG: Tạo object update loại bỏ toàn bộ trường rỗng/null/undefined
  const updateData = {};
  const isValidValue = (val) => val !== undefined && val !== null && String(val).trim() !== '';

  if (isValidValue(full_name)) updateData.full_name = full_name.trim();
  if (isValidValue(phone_number)) updateData.phone_number = phone_number.trim();
  if (isValidValue(gender)) updateData.gender = gender;
  if (isValidValue(dob)) updateData.dob = dob;
  if (avatarUrl) updateData.avatar_url = avatarUrl; 
  updateData.updated_at = new Date();

  // 4. Tiến hành cập nhật vào bảng user_profiles
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update(updateData)
    .eq('account_id', accountId);

  if (updateError) {
    console.error('Lỗi DB:', updateError.message);
    throw new Error('Cập nhật thất bại do lỗi hệ thống cơ sở dữ liệu!');
  }

  // 5. TRẢ VỀ GIÁ TRỊ MỚI NẾU THAY ĐỔI - NẾU KHÔNG THÌ TRẢ VỀ GIÁ TRỊ BAN ĐẦU
  const responseData = {
    full_name: updateData.full_name || existingProfile.full_name,
    phone_number: updateData.phone_number || existingProfile.phone_number,
    gender: updateData.gender || existingProfile.gender,
    dob: updateData.dob || existingProfile.dob,
    avatar_url: avatarUrl || existingProfile.avatar_url 
  };

  return {
    message: 'Cập nhật thông tin hồ sơ thành công!',
    profile: responseData
  };
};



// ================== ADMIN =====================

// thêm nhân viên
export const createStaff = async (staffData, avatarFile) => {
  const { 
    email, phone, full_name, identity_card, gender, dob, address 
  } = staffData;
  let avatarUrl = null;
  
  const now = new Date().toISOString();

  // 1. Kiểm tra xem Email, Phone hoặc CCCD đã tồn tại trong hệ thống chưa
  const { data: existingAcc } = await supabase
    .from('accounts')
    .select('account_id')
    .or(`email.eq.${email},phone.eq.${phone}`)
    .single();

  if (existingAcc) {
    throw new Error('Email hoặc số điện thoại này đã được sử dụng!');
  }

  if (identity_card) {
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('profile_id')
      .eq('identity_card', identity_card.trim())
      .single();

    if (existingProfile) {
      throw new Error('Số CMND/CCCD này đã tồn tại trên hệ thống!');
    }
  }

  // Tải ảnh đại diện lên Supabase Storage nếu Admin có chọn file ảnh
  if (avatarFile) {
    avatarUrl = await uploadAvatar('staff', Date.now(), avatarFile);
  }

  // 2. Tìm Role 'staff' động từ DB để lấy đúng role_id
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('role_id, name')
    .eq('name', 'staff')
    .single();

  if (roleError || !roleData) {
    throw new Error('Hệ thống chưa cấu hình vai trò "staff" (nhân viên)!');
  }

  // 3. Tạo mật khẩu mặc định bằng chính số điện thoại và mã hóa Bcrypt
  const hashedPassword = await bcrypt.hash(phone.trim(), 10);
  const accountId = 'acc-' + generateId();

  // 4. BƯỚC 1: Tạo tài khoản trong bảng accounts trước
  const { error: accError } = await supabase
    .from('accounts')
    .insert([{
      account_id: accountId,
      email: email.trim(),
      phone: phone.trim(),
      password: hashedPassword,
      role_id: roleData.role_id,
      role_name: roleData.name,
      status: 'active',
      created_at: now,
      updated_at: now
    }]);

  if (accError) {
    console.error('Lỗi insert accounts:', accError.message);
    throw new Error(`Lỗi khi tạo tài khoản nhân viên: ${accError.message}`);
  }

  // 5. BƯỚC 2: Tạo hồ sơ thông tin chi tiết trong bảng user_profiles
  const profileId = 'user-' + generateId();
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert([{
      profile_id: profileId,
      account_id: accountId, 
      full_name: full_name ? full_name.trim() : null,
      phone_number: phone.trim(),
      identity_card: identity_card ? identity_card.trim() : null,
      avatar_url: avatarUrl, 
      dob: dob || null,
      address: address ? address.trim() : null,
      status: 'active',
      created_at: now,
      updated_at: now
    }]);

  if (profileError) {
    console.error('Lỗi insert user_profiles:', profileError.message);
    throw new Error(`Tạo tài khoản thành công nhưng lỗi tạo hồ sơ: ${profileError.message}`);
  }

  return {
    accountId,
    profileId,
    email,
    role_name: roleData.name
  };
};
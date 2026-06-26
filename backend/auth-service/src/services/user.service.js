import { config } from '../configs/index.js';
import { supabase } from '../configs/supabase.js';
import bcrypt from 'bcrypt';


const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

// xử lý ảnh
const uploadAvatar = async (prefix, identifier, avatarFile) => {
  // Kiểm tra nghiêm ngặt cấu trúc file từ Multer
  if (!avatarFile || !avatarFile.originalname || !avatarFile.buffer) {
    console.error("File gửi lên không hợp lệ hoặc thiếu buffer/originalname");
    return null;
  }

  // 1. Lấy phần mở rộng của file
  const fileExt = avatarFile.originalname.split('.').pop();
  
  // 2. Tạo tên file chuẩn hóa không dùng dấu gạch dưới theo yêu cầu cũ
  const fileName = `Avatar${prefix}${identifier}${Date.now()}.${fileExt}`;

  // 3. Tiến hành upload lên bucket 'avatars'
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, avatarFile.buffer, {
      contentType: avatarFile.mimetype || 'image/jpeg',
      upsert: true
    });

  if (uploadError) {
    console.error(`Lỗi Supabase Storage (${prefix}):`, uploadError.message);
    throw new Error(`Lỗi Storage: ${uploadError.message}`);
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
    avatarUrl = await uploadAvatar('_customer', accountId, avatarFile);
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

  // 1. Kiểm tra Email đã tồn tại chưa
  const { data: emailCheck, error: emailError } = await supabase
    .from('accounts')
    .select('account_id')
    .eq('email', email.trim());

  // Nếu có dữ liệu trả về (mảng không rỗng) -> Email đã tồn tại
  if (emailCheck && emailCheck.length > 0) {
    throw new Error('Email này đã được sử dụng!');
  }

  // 2. Kiểm tra Số điện thoại đã tồn tại chưa
  const { data: phoneCheck, error: phoneError } = await supabase
    .from('accounts')
    .select('account_id')
    .eq('phone', phone.trim());

  // Nếu có dữ liệu trả về (mảng không rỗng) -> Số điện thoại đã tồn tại
  if (phoneCheck && phoneCheck.length > 0) {
    throw new Error('Số điện thoại này đã được sử dụng!');
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
    avatarUrl = await uploadAvatar('_staff', Date.now(), avatarFile);
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

// lấy danh sách hồ sơ người dùng 
export const getProfileList = async (page, limit) => {
  // 1. Đếm tổng số bản ghi hiện có trong DB trước bằng cơ chế head: true (tối ưu hóa tốc độ đếm)
  const { count, error: countError } = await supabase
    .from('user_profiles')
    .select('profile_id', { count: 'exact', head: true });

  if (countError) {
    console.error('Lỗi DB khi đếm số lượng profile:', countError.message);
    throw new Error(`Lỗi hệ thống cơ sở dữ liệu: ${countError.message}`);
  }

  const totalItems = count || 0;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Nếu vị trí bắt đầu vượt quá tổng số bản ghi, trả về mảng rỗng ngay, không gọi .range() tránh sập lỗi 500
  if (from >= totalItems || totalItems === 0) {
    return {
      profiles: [],
      totalItems: totalItems
    };
  }

  // 2. TIẾN HÀNH LẤY DỮ LIỆU 
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select(`
      profile_id,
      account_id,
      full_name,
      phone_number,
      identity_card,
      accounts (
        email,
        status
      )
    `)
    .order('profile_id', { ascending: true })
    .range(from, to); 

  if (error) {
    console.error('Lỗi DB khi lấy danh sách profile:', error.message);
    throw new Error(`Lỗi hệ thống cơ sở dữ liệu: ${error.message}`);
  }

  // Chuẩn hóa cấu trúc dữ liệu trả về giống cấp cũ
  const formattedProfiles = (profiles || []).map(item => ({
    profile_id: item.profile_id,
    account_id: item.account_id,
    name: item.full_name,
    phone: item.phone_number,
    identity_card: item.identity_card,
    email: item.accounts ? item.accounts.email : null,
    status: item.accounts ? item.accounts.status : null
  }));

  return {
    profiles: formattedProfiles,
    totalItems: totalItems
  };
};
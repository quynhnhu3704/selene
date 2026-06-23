import { config } from '../configs/index.js';
import { supabase } from '../configs/supabase.js';

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
    const fileExt = avatarFile.originalname.split('.').pop();
    const fileName = `avatar_${accountId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile.buffer, {
        contentType: avatarFile.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Lỗi Storage:', uploadError.message);
      throw new Error('Lỗi trong quá trình tải ảnh đại diện lên Supabase Storage!');
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    avatarUrl = publicUrlData.publicUrl;
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
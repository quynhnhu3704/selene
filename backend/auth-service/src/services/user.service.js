import { config } from '../configs/index.js';
import bcrypt from 'bcrypt';
import { UserProfileModel } from '../models/userProfile.model.js';

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

  // 3. Tiến hành upload lên bucket 'avatars' thông qua Model
  try {
    const publicUrl = await UserProfileModel.uploadAvatarFile(
      fileName, 
      avatarFile.buffer, 
      avatarFile.mimetype || 'image/jpeg'
    );
    return publicUrl;
  } catch (uploadError) {
    console.error(`Lỗi Supabase Storage (${prefix}):`, uploadError.message);
    throw new Error(`Lỗi Storage: ${uploadError.message}`);
  }
};

// ================== CUSTOMER =====================

// cập nhật hồ sơ thông tin khách hàng
export const updateCustomerProfile = async (accountId, profileData, avatarFile) => {
  const { full_name, phone_number, gender, dob } = profileData;
  let avatarUrl = null;

  // 1. LẤY GIÁ TRỊ BAN ĐẦU: 
  const existingProfile = await UserProfileModel.getProfileByAccountId(accountId);

  if (!existingProfile) {
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
  try {
    await UserProfileModel.updateProfileByAccountId(accountId, updateData);
  } catch (updateError) {
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
  const emailCheck = await UserProfileModel.checkEmailExists(email);

  // Nếu có dữ liệu trả về (mảng không rỗng) -> Email đã tồn tại
  if (emailCheck && emailCheck.length > 0) {
    throw new Error('Email này đã được sử dụng!');
  }

  // 2. Kiểm tra Số điện thoại đã tồn tại chưa
  const phoneCheck = await UserProfileModel.checkPhoneExists(phone);

  // Nếu có dữ liệu trả về (mảng không rỗng) -> Số điện thoại đã tồn tại
  if (phoneCheck && phoneCheck.length > 0) {
    throw new Error('Số điện thoại này đã được sử dụng!');
  }

  if (identity_card) {
    const existingProfile = await UserProfileModel.checkDuplicate('user_profiles', 'identity_card', identity_card.trim());

    if (existingProfile) {
      throw new Error('Số CMND/CCCD này đã tồn tại trên hệ thống!');
    }
  }

  // Tải ảnh đại diện lên Supabase Storage nếu Admin có chọn file ảnh
  if (avatarFile) {
    avatarUrl = await uploadAvatar('_staff', Date.now(), avatarFile);
  }

  // 2. Tìm Role 'staff' động từ DB để lấy đúng role_id
  let roleData;
  try {
    roleData = await UserProfileModel.findRoleByName('staff');
  } catch (roleError) {
    throw new Error('Hệ thống chưa cấu hình vai trò "staff" (nhân viên)!');
  }

  // 3. Tạo mật khẩu mặc định bằng chính số điện thoại và mã hóa Bcrypt
  const hashedPassword = await bcrypt.hash(phone.trim(), 10);
  const accountId = 'acc-' + generateId();

  // 4. BƯỚC 1: Tạo tài khoản trong bảng accounts trước
  try {
    await UserProfileModel.insertAccount({
      account_id: accountId,
      email: email.trim(),
      phone: phone.trim(),
      password: hashedPassword,
      role_id: roleData.role_id,
      role_name: roleData.name,
      status: 'active',
      created_at: now,
      updated_at: now
    });
  } catch (accError) {
    console.error('Lỗi insert accounts:', accError.message);
    throw new Error(`Lỗi khi tạo tài khoản nhân viên: ${accError.message}`);
  }

  // 5. BƯỚC 2: Tạo hồ sơ thông tin chi tiết trong bảng user_profiles
  const profileId = 'user-' + generateId();
  try {
    await UserProfileModel.insertProfile({
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
    });
  } catch (profileError) {
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
  let totalItems = 0;
  try {
    totalItems = await UserProfileModel.countProfiles();
  } catch (countError) {
    console.error('Lỗi DB khi đếm số lượng profile:', countError.message);
    throw new Error(`Lỗi hệ thống cơ sở dữ liệu: ${countError.message}`);
  }

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
  let profiles = [];
  try {
    profiles = await UserProfileModel.getProfilesInRange(from, to);
  } catch (error) {
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
    status: item.accounts ? item.accounts.status : null,
    role_name: item.accounts ? item.accounts.role_name : null
  }));

  return {
    profiles: formattedProfiles,
    totalItems: totalItems
  };
};

// lấy thông tin chi tiết hồ sơ
export const getProfileDetail = async (profileId) => {
  const profile = await UserProfileModel.getProfileDetailById(profileId);

  // Nếu không tìm thấy hoặc có lỗi
  if (!profile) {
    throw new Error('Không tìm thấy thông tin hồ sơ người dùng hợp lệ!');
  }

  const formattedDetail = {
    profile_id: profile.profile_id,
    full_name: profile.full_name,
    identity_card: profile.identity_card,
    avatar_url: profile.avatar_url,
    gender: profile.gender,
    dob: profile.dob,
    address: profile.address,
    status: profile.status,
    
    email: profile.accounts ? profile.accounts.email : null,
    phone: profile.phone_number, 
    role_name: profile.accounts ? profile.accounts.role_name : null,
  };

  return formattedDetail;
};

// cập nhật thông tin tối ưu đồng bộ 2 bảng accounts và user_profiles 
export const updateProfileAll = async (accountId, updateFields, avatarFile) => {
  const { full_name, phone, email, identity_card, gender, dob, address, status } = updateFields;
  let avatarUrl = null;
  const now = new Date();

  const normalizedStatus = status ? String(status).trim().toLowerCase() : undefined;
  const normalizedGender = gender ? String(gender).trim().toLowerCase() : undefined;

  // 1. LẤY THÔNG TIN HIỆN TẠI TRONG DB ĐỂ ĐỐI CHIẾU
  const existingAccount = await UserProfileModel.getAccountById(accountId);
  const existingProfile = await UserProfileModel.getProfileByAccountId(accountId);

  if (!existingAccount || !existingProfile) {
    throw new Error('Không tìm thấy tài khoản hoặc hồ sơ người dùng hợp lệ!');
  }

  const isValidAndChanged = (newVal, oldVal) => {
    return newVal !== undefined && newVal !== null && String(newVal).trim() !== '' && String(newVal).trim() !== String(oldVal);
  };

  // 2. KIỂM TRA TRÙNG LẶP DỮ LIỆU (Email, Phone, CCCD)
  if (isValidAndChanged(email, existingAccount.email)) {
    const checkEmail = await UserProfileModel.checkDuplicate('accounts', 'email', email.trim());
    if (checkEmail) throw new Error('Email mới này đã được sử dụng bởi một tài khoản khác!');
  }

  if (isValidAndChanged(phone, existingAccount.phone)) {
    const checkPhone = await UserProfileModel.checkDuplicate('accounts', 'phone', phone.trim());
    if (checkPhone) throw new Error('Số điện thoại mới này đã được sử dụng bởi một tài khoản khác!');
  }

  if (isValidAndChanged(identity_card, existingProfile.identity_card)) {
    const checkIdCard = await UserProfileModel.checkDuplicate('user_profiles', 'identity_card', identity_card.trim());
    if (checkIdCard) throw new Error('Số CMND/CCCD mới này đã tồn tại trên hệ thống!');
  }

  // 3. XỬ LÝ LƯU ẢNH TRÊN SUPABASE STORAGE & XÓA ẢNH CŨ
  if (avatarFile) {
    const identifier = (phone && phone.trim()) || existingAccount.phone;
    avatarUrl = await uploadAvatar('user', identifier, avatarFile);

    if (existingProfile.avatar_url && avatarUrl) {
      try {
        const urlParts = existingProfile.avatar_url.split('/avatars/');
        const oldFileName = urlParts.length > 1 ? urlParts[1] : null;

        if (oldFileName) {
          const { error: storageError } = await UserProfileModel.deleteAvatarFile(oldFileName);

          if (storageError) {
            console.error('Lỗi Supabase Storage khi xóa file cũ:', storageError.message);
          }
        }
      } catch (err) {
        console.error('Không thể xử lý xóa ảnh cũ:', err.message);
      }
    }
  }

  // 4. TIẾN HÀNH XÂY DỰNG OBJECT CẬP NHẬT ĐỘNG
  const accountUpdate = {};
  const profileUpdate = {};

  // 4.1. Xử lý các trường thuộc bảng `accounts`
  if (isValidAndChanged(email, existingAccount.email)) accountUpdate.email = email.trim();
  if (isValidAndChanged(phone, existingAccount.phone)) accountUpdate.phone = phone.trim();
  if (isValidAndChanged(normalizedStatus, existingAccount.status)) accountUpdate.status = normalizedStatus;

  // 4.2. Xử lý các trường thuộc bảng `user_profiles`
  if (isValidAndChanged(full_name, existingProfile.full_name)) profileUpdate.full_name = full_name.trim();
  if (isValidAndChanged(phone, existingProfile.phone_number)) profileUpdate.phone_number = phone.trim();
  if (isValidAndChanged(identity_card, existingProfile.identity_card)) profileUpdate.identity_card = identity_card.trim();
  if (isValidAndChanged(dob, existingProfile.dob)) profileUpdate.dob = dob;
  if (isValidAndChanged(address, existingProfile.address)) profileUpdate.address = address.trim();
  if (isValidAndChanged(normalizedGender, existingProfile.gender)) profileUpdate.gender = normalizedGender;
  if (isValidAndChanged(normalizedStatus, existingProfile.status)) profileUpdate.status = normalizedStatus;
  if (avatarUrl) profileUpdate.avatar_url = avatarUrl;

  // 5. THỰC THI THAY ĐỔI VÀO DATABASE
  if (Object.keys(accountUpdate).length > 0) {
    accountUpdate.updated_at = now;
    try {
      await UserProfileModel.updateAccountById(accountId, accountUpdate);
    } catch (errAcc) {
      throw new Error(`Lỗi hệ thống khi cập nhật bảng tài khoản: ${errAcc.message}`);
    }
  }

  if (Object.keys(profileUpdate).length > 0) {
    profileUpdate.updated_at = now;
    try {
      await UserProfileModel.updateProfileByAccountId(accountId, profileUpdate);
    } catch (errProf) {
      throw new Error(`Lỗi hệ thống khi cập nhật bảng hồ sơ: ${errProf.message}`);
    }
  }

  // 6. TRẢ VỀ DỮ LIỆU MỚI NHẤT
  return {
    message: 'Cập nhật và đồng bộ thông tin người dùng thành công!',
    profile: {
      account_id: accountId,
      profile_id: existingProfile.profile_id,
      email: accountUpdate.email || existingAccount.email,
      phone: accountUpdate.phone || existingAccount.phone,
      status: accountUpdate.status || existingAccount.status,
      full_name: profileUpdate.full_name || existingProfile.full_name,
      identity_card: profileUpdate.identity_card || existingProfile.identity_card,
      gender: profileUpdate.gender || existingProfile.gender, 
      dob: profileUpdate.dob || existingProfile.dob,
      address: profileUpdate.address || existingProfile.address,
      avatar_url: avatarUrl || existingProfile.avatar_url
    }
  };
};
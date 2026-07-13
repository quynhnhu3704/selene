// backend\auth-service\src\services\permission.service.js
import { config } from '../configs/index.js';
import bcrypt from 'bcrypt';
import { UserProfileModel } from '../models/userProfile.model.js';
import { AccountModel } from '../models/account.model.js';

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

// lấy thông tin khách hàng
export const getCustomerProfile = async (accountId) => {
  // 1. Gọi model lấy profile bằng accountId ban đầu
  const profile = await UserProfileModel.getProfileByAccountId(accountId);
  const account = await AccountModel.findById(accountId);

  if (!profile || !account) {
    throw new Error('Không tìm thấy hồ sơ người dùng hợp lệ!');
  }

  // 2. Trả về thông tin profile tìm được
  return {
    message: 'Lấy thông tin hồ sơ thành công!',
    profile: {
      profile_id: profile.profile_id,
      full_name: profile.full_name,
      email: account.email,
      phone_number: profile.phone_number,
      avatar_url: profile.avatar_url,
      gender: profile.gender,
      dob: profile.dob,
    }
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
      // phone: phone.trim(),
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
      gender: gender,
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

// cập nhật thông tin đồng bộ 2 bảng (admin update)
export const updateProfileAll = async (accountId, profileData, avatarFile) => {
  const { full_name, phone, email, identity_card, gender, dob, address, status } = profileData;
  let avatarUrl = null;

  const existingProfile = await UserProfileModel.getProfileByAccountId(accountId);
  if (!existingProfile) {
    throw new Error('Không tìm thấy hồ sơ người dùng hợp lệ!');
  }

  const existingAccount = await AccountModel.findById(accountId);
  if (!existingAccount) {
    throw new Error('Không tìm thấy tài khoản người dùng hợp lệ!');
  }

  if (email && email.trim() !== existingAccount.email) {
    const emailCheck = await UserProfileModel.checkEmailExists(email.trim());
    if (emailCheck && emailCheck.length > 0) {
      throw new Error('Email này đã được sử dụng!');
    }
  }

  if (phone && phone.trim() !== existingProfile.phone_number) {
    const phoneCheck = await UserProfileModel.checkDuplicate('user_profiles', 'phone_number', phone.trim());
    if (phoneCheck) {
      throw new Error('Số điện thoại này đã được sử dụng!');
    }
  }

  if (identity_card && identity_card.trim() !== existingProfile.identity_card) {
    const idCheck = await UserProfileModel.checkDuplicate('user_profiles', 'identity_card', identity_card.trim());
    if (idCheck) {
      throw new Error('Số CMND/CCCD này đã tồn tại trên hệ thống!');
    }
  }

  if (avatarFile) {
    avatarUrl = await uploadAvatar('_admin', accountId, avatarFile);
  }

  const accountUpdateData = {};
  const profileUpdateData = {};

  if (email) accountUpdateData.email = email.trim();
  if (status) accountUpdateData.status = status;

  if (full_name) profileUpdateData.full_name = full_name.trim();
  if (phone) profileUpdateData.phone_number = phone.trim();
  if (identity_card) profileUpdateData.identity_card = identity_card.trim();
  if (gender) profileUpdateData.gender = gender;
  if (dob) profileUpdateData.dob = dob;
  if (address) profileUpdateData.address = address.trim();
  if (status) profileUpdateData.status = status;
  if (avatarUrl) profileUpdateData.avatar_url = avatarUrl;

  const updatePromises = [];

  if (Object.keys(accountUpdateData).length > 0) {
    updatePromises.push(AccountModel.updateAccountById(accountId, accountUpdateData));
  }
  if (Object.keys(profileUpdateData).length > 0) {
    updatePromises.push(UserProfileModel.updateProfileByAccountId(accountId, profileUpdateData));
  }

  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
  }

  const updatedProfile = await getProfileDetail(existingProfile.profile_id);

  return {
    message: 'Cập nhật hồ sơ thành công!',
    profile: updatedProfile
  };
};

// cập nhật thông tin tối ưu đồng bộ 2 bảng accounts và user_profiles 
export const updateAccount = async (accountId, { email, phone, status }) => {
  const accountUpdateData = {};
  const profileUpdateData = {};

  // 1. Gom dữ liệu cập nhật cho bảng accounts
  if (email) accountUpdateData.email = email;
  // if (phone) accountUpdateData.phone = phone;
  if (status) accountUpdateData.status = status;
  // if (password) {
  //   const saltRounds = 10;
  //   accountUpdateData.password = await bcrypt.hash(password, saltRounds);
  // }

  // 2. Gom dữ liệu cập nhật đồng bộ cho bảng user_profiles
  if (phone) profileUpdateData.phone_number = phone;
  if (status) profileUpdateData.status = status;

  // 3. Thực thi cập nhật song song vào Database
  const updatePromises = [];

  if (Object.keys(accountUpdateData).length > 0) {
    updatePromises.push(AccountModel.updateAccountById(accountId, accountUpdateData));
  }
  if (Object.keys(profileUpdateData).length > 0) {
    updatePromises.push(UserProfileModel.updateProfileByAccountId(accountId, profileUpdateData));
  }

  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
  }

  // 4. Lấy lại dữ liệu mới nhất để phản hồi cho client
  const updatedAccount = await UserProfileModel.getAccountById(accountId);

  return {
    message: 'Cập nhật thông tin tài khoản và hồ sơ thành công!',
    account: updatedAccount
  };
};

// lấy danh sách account
export const getAccountList = async (page = 1, limit = 10) => {
  // Đảm bảo page và limit là số nguyên dương
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, parseInt(limit));

  const from = (pageNum - 1) * limitNum;
  const to = from + limitNum - 1;

  const [totalItems, accounts] = await Promise.all([
    AccountModel.countAccounts(),
    AccountModel.getAccountsInRange(from, to)
  ]);

  // Tính toán tổng số trang
  const totalPages = Math.ceil(totalItems / limitNum);

  return {
    accounts,
    pagination: {
      currentPage: pageNum,
      limit: limitNum,
      totalItems,
      totalPages
    }
  };
};

// thay đổ mật khẩu
export const changePassword = async (accountId, newPassword) => {
  if (!newPassword) {
    throw new Error('Vui lòng cung cấp mật khẩu mới!');
  }

  // 1. Mã hóa mật khẩu mới bằng bcrypt
  const saltRounds = 10;
  const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

  // 2. Chỉ gọi DUY NHẤT lớp Model để cập nhật xuống DB (Không viết lệnh supabase tại đây nữa)
  await AccountModel.updateAccountById(accountId, { password: hashedNewPassword });

  return { message: 'Đổi mật khẩu mới thành công!' };
};
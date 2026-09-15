// backend\auth-service\src\services\user.service.js
import { getOrderCounts } from "./order-count.service.js";
import bcrypt from "bcrypt";
import { UserProfileModel } from "../models/userProfile.model.js";
import { AccountModel } from "../models/account.model.js";

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
  const fileExt = avatarFile.originalname.split(".").pop();

  // 2. Tạo tên file chuẩn hóa không dùng dấu gạch dưới theo yêu cầu cũ
  const fileName = `Avatar${prefix}${identifier}${Date.now()}.${fileExt}`;

  // 3. Tiến hành upload lên bucket 'avatars' thông qua Model
  try {
    const publicUrl = await UserProfileModel.uploadAvatarFile(
      fileName,
      avatarFile.buffer,
      avatarFile.mimetype || "image/jpeg",
    );
    return publicUrl;
  } catch (uploadError) {
    console.error(`Lỗi Supabase Storage (${prefix}):`, uploadError.message);
    throw new Error(`Lỗi Storage: ${uploadError.message}`);
  }
};

// ================== CUSTOMER =====================

// cập nhật hồ sơ thông tin khách hàng
export const updateCustomerProfile = async (
  accountId,
  profileData,
  avatarFile,
) => {
  const { full_name, phone_number, gender, dob } = profileData;
  let avatarUrl = null;

  // 1. LẤY GIÁ TRỊ BAN ĐẦU:
  const existingProfile =
    await UserProfileModel.getProfileByAccountId(accountId);

  if (!existingProfile) {
    throw new Error("Không tìm thấy hồ sơ người dùng hợp lệ!");
  }

  // 2. Xử lý tải ảnh lên Supabase Storage nếu có file mới được chọn
  if (avatarFile) {
    avatarUrl = await uploadAvatar("_customer", accountId, avatarFile);
  }

  // 3. XỬ LÝ LOGIC ĐỘNG: Tạo object update loại bỏ toàn bộ trường rỗng/null/undefined
  const updateData = {};
  const isValidValue = (val) =>
    val !== undefined && val !== null && String(val).trim() !== "";

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
    console.error("Lỗi DB:", updateError.message);
    throw new Error("Cập nhật thất bại do lỗi hệ thống cơ sở dữ liệu!");
  }

  // 5. TRẢ VỀ GIÁ TRỊ MỚI NẾU THAY ĐỔI - NẾU KHÔNG THÌ TRẢ VỀ GIÁ TRỊ BAN ĐẦU
  const responseData = {
    full_name: updateData.full_name || existingProfile.full_name,
    phone_number: updateData.phone_number || existingProfile.phone_number,
    gender: updateData.gender || existingProfile.gender,
    dob: updateData.dob || existingProfile.dob,
    avatar_url: avatarUrl || existingProfile.avatar_url,
  };

  return {
    message: "Cập nhật thông tin hồ sơ thành công!",
    profile: responseData,
  };
};

// lấy thông tin khách hàng
export const getCustomerProfile = async (accountId) => {
  // 1. Gọi model lấy profile bằng accountId ban đầu
  const profile = await UserProfileModel.getProfileByAccountId(accountId);
  const account = await AccountModel.findById(accountId);

  if (!profile || !account) {
    throw new Error("Không tìm thấy hồ sơ người dùng hợp lệ!");
  }

  // 2. Trả về thông tin profile tìm được
  return {
    message: "Lấy thông tin hồ sơ thành công!",
    profile: {
      profile_id: profile.profile_id,
      full_name: profile.full_name,
      email: account.email,
      phone_number: profile.phone_number,
      avatar_url: profile.avatar_url,
      gender: profile.gender,
      dob: profile.dob,
      role_id: account.role_id,
    },
  };
};
// ================== STAFF =====================

// lấy thông tin nhân viên
export const getStaffProfile = async (accountId) => {
  const profile = await UserProfileModel.getProfileByAccountId(accountId);
  const account = await AccountModel.findById(accountId);

  if (!profile || !account) {
    throw new Error("Không tìm thấy hồ sơ người dùng hợp lệ!");
  }

  return {
    message: "Lấy thông tin hồ sơ thành công!",
    profile: {
      profile_id: profile.profile_id,
      full_name: profile.full_name,
      email: account.email,
      phone_number: profile.phone_number,
      identity_card: profile.identity_card,
      avatar_url: profile.avatar_url,
      gender: profile.gender,
      dob: profile.dob,
      address: profile.address,
      status: profile.status,
      role_id: account.role_id,
    },
  };
};

// cập nhật hồ sơ thông tin nhân viên (cá nhân)
export const updateStaffProfile = async (
  accountId,
  profileData,
  avatarFile,
  clearOptional = false,
) => {
  const {
    full_name,
    email,
    phone_number,
    identity_card,
    gender,
    dob,
    address,
  } = profileData;
  let avatarUrl = null;

  const existingProfile =
    await UserProfileModel.getProfileByAccountId(accountId);
  const existingAccount = await UserProfileModel.getAccountById(accountId);

  if (!existingProfile || !existingAccount) {
    throw new Error("Không tìm thấy hồ sơ người dùng hợp lệ!");
  }

  if (identity_card && identity_card.trim() !== existingProfile.identity_card) {
    const duplicateId = await UserProfileModel.checkDuplicate(
      "user_profiles",
      "identity_card",
      identity_card.trim(),
    );
    if (duplicateId && duplicateId.account_id !== accountId) {
      throw new Error("Số CMND/CCCD này đã được sử dụng!");
    }
  }

  if (phone_number && phone_number.trim() !== existingProfile.phone_number) {
    const phoneCheck = await UserProfileModel.checkPhoneExists(
      phone_number.trim(),
    );
    if (phoneCheck && phoneCheck.length > 0) {
      const isDuplicate = phoneCheck.some((p) => p.account_id !== accountId);
      if (isDuplicate) {
        throw new Error("Số điện thoại này đã được sử dụng!");
      }
    }
  }

  if (email && email.trim() !== existingAccount.email) {
    const emailCheck = await UserProfileModel.checkEmailExists(email.trim());
    if (emailCheck && emailCheck.length > 0) {
      const isDuplicate = emailCheck.some((a) => a.account_id !== accountId);
      if (isDuplicate) {
        throw new Error("Email này đã được sử dụng!");
      }
    }
  }

  if (avatarFile) {
    avatarUrl = await uploadAvatar(`_${existingAccount.role_name}`, accountId, avatarFile);
  }

  const updateData = {};
  const accountUpdateData = {};
  const isValidValue = (val) =>
    val !== undefined && val !== null && String(val).trim() !== "";

  if (isValidValue(full_name)) updateData.full_name = full_name.trim();
  if (isValidValue(phone_number)) {
    updateData.phone_number = phone_number.trim();
  }
  if (isValidValue(identity_card))
    updateData.identity_card = identity_card.trim();
  if (isValidValue(gender)) updateData.gender = gender;
  if (isValidValue(dob)) updateData.dob = dob;
  if (isValidValue(address)) updateData.address = address.trim();
  if (avatarUrl) updateData.avatar_url = avatarUrl;
  updateData.updated_at = new Date();

  if (isValidValue(email)) accountUpdateData.email = email.trim();
  if (isValidValue(phone_number)) accountUpdateData.phone = phone_number.trim();
  if (clearOptional) {
    for (const key of ["identity_card", "gender", "dob", "address"]) {
      if (profileData[key] === "") updateData[key] = null;
    }
  }

  if (
    Object.keys(updateData).length > 1 ||
    Object.keys(accountUpdateData).length > 0
  ) {
    try {
      if (Object.keys(updateData).length > 1) {
        await UserProfileModel.updateProfileByAccountId(accountId, updateData);
      }
      if (Object.keys(accountUpdateData).length > 0) {
        await AccountModel.updateAccountById(accountId, accountUpdateData);
      }
    } catch (updateError) {
      console.error("Lỗi DB:", updateError.message);
      throw new Error("Cập nhật thất bại do lỗi hệ thống cơ sở dữ liệu!");
    }
  }

  const responseData = {
    full_name: updateData.full_name || existingProfile.full_name,
    email: accountUpdateData.email || existingAccount.email,
    phone_number: updateData.phone_number || existingProfile.phone_number,
    identity_card: updateData.identity_card || existingProfile.identity_card,
    gender: updateData.gender || existingProfile.gender,
    dob: updateData.dob || existingProfile.dob,
    address: updateData.address || existingProfile.address,
    avatar_url: avatarUrl || existingProfile.avatar_url,
  };

  return {
    message: "Cập nhật thông tin cá nhân thành công!",
    profile: responseData,
  };
};

// ================== ADMIN =====================

// thêm nhân viên
export const createStaff = (staffData, avatarFile) => {
  return createAdminAccount(staffData, avatarFile, "staff");
};

// Thêm khách hàng
export const createCustomer = (customerData, avatarFile) => {
  return createAdminAccount(customerData, avatarFile, "customer");
};

// Tạo tài khoản và hồ sơ với vai trò do endpoint quyết định.
const createAdminAccount = async (profileData, avatarFile, roleName) => {
  validateAdminProfile(profileData);
  const { email, phone, full_name, identity_card, gender, dob, address } =
    profileData;
  let avatarUrl = null;

  const now = new Date().toISOString();

  // 1. Kiểm tra Email đã tồn tại chưa
  const emailCheck = await UserProfileModel.checkEmailExists(email);

  // Nếu có dữ liệu trả về (mảng không rỗng) -> Email đã tồn tại
  if (emailCheck && emailCheck.length > 0) {
    throw new Error("Email này đã được sử dụng!");
  }

  // 2. Kiểm tra Số điện thoại đã tồn tại chưa
  const phoneCheck = await UserProfileModel.checkPhoneExists(phone);

  // Nếu có dữ liệu trả về (mảng không rỗng) -> Số điện thoại đã tồn tại
  if (phoneCheck && phoneCheck.length > 0) {
    throw new Error("Số điện thoại này đã được sử dụng!");
  }

  if (identity_card) {
    const existingProfile = await UserProfileModel.checkDuplicate(
      "user_profiles",
      "identity_card",
      identity_card.trim(),
    );

    if (existingProfile) {
      throw new Error("Số CMND/CCCD này đã tồn tại trên hệ thống!");
    }
  }

  // Tải ảnh đại diện lên Supabase Storage nếu Admin có chọn file ảnh
  if (avatarFile) {
    avatarUrl = await uploadAvatar(`_${roleName}`, Date.now(), avatarFile);
  }

  // 2. Tìm vai trò từ DB để lấy đúng role_id
  let roleData;
  try {
    roleData = await UserProfileModel.findRoleByName(roleName);
  } catch (roleError) {
    throw new Error(`Hệ thống chưa cấu hình vai trò "${roleName}"!`);
  }

  // 3. Tạo mật khẩu mặc định bằng chính số điện thoại và mã hóa Bcrypt
  const hashedPassword = await bcrypt.hash(phone.trim(), 10);
  const accountId = "acc-" + generateId();

  // 4. BƯỚC 1: Tạo tài khoản trong bảng accounts trước
  try {
    await UserProfileModel.insertAccount({
      account_id: accountId,
      email: email.trim(),
      phone: phone.trim(),
      password: hashedPassword,
      role_id: roleData.role_id,
      role_name: roleData.name,
      status: "active",
      created_at: now,
      updated_at: now,
    });
  } catch (accError) {
    console.error("Lỗi insert accounts:", accError.message);
    throw new Error(`Lỗi khi tạo tài khoản: ${accError.message}`);
  }

  // 5. BƯỚC 2: Tạo hồ sơ thông tin chi tiết trong bảng user_profiles
  const profileId = "user-" + generateId();
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
      status: "active",
      created_at: now,
      updated_at: now,
    });
  } catch (profileError) {
    console.error("Lỗi insert user_profiles:", profileError.message);
    throw new Error(
      `Tạo tài khoản thành công nhưng lỗi tạo hồ sơ: ${profileError.message}`,
    );
  }

  return {
    accountId,
    profileId,
    email,
    role_name: roleData.name,
  };
};

// lấy danh sách hồ sơ người dùng
export const getProfileList = async (page, limit) => {
  // 1. Đếm tổng số bản ghi hiện có trong DB trước bằng cơ chế head: true (tối ưu hóa tốc độ đếm)
  let totalItems = 0;
  try {
    totalItems = await UserProfileModel.countProfiles();
  } catch (countError) {
    console.error("Lỗi DB khi đếm số lượng profile:", countError.message);
    throw new Error(`Lỗi hệ thống cơ sở dữ liệu: ${countError.message}`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Nếu vị trí bắt đầu vượt quá tổng số bản ghi, trả về mảng rỗng ngay, không gọi .range() tránh sập lỗi 500
  if (from >= totalItems || totalItems === 0) {
    return {
      profiles: [],
      totalItems: totalItems,
    };
  }

  // 2. TIẾN HÀNH LẤY DỮ LIỆU
  let profiles = [];
  try {
    profiles = await UserProfileModel.getProfilesInRange(from, to);
  } catch (error) {
    console.error("Lỗi DB khi lấy danh sách profile:", error.message);
    throw new Error(`Lỗi hệ thống cơ sở dữ liệu: ${error.message}`);
  }

  // Chuẩn hóa cấu trúc dữ liệu trả về giống cấp cũ
  const formattedProfiles = (profiles || []).map((item) => ({
    profile_id: item.profile_id,
    account_id: item.account_id,
    name: item.full_name,
    phone: item.phone_number,
    identity_card: item.identity_card,
    email: item.accounts ? item.accounts.email : null,
    status: item.accounts ? item.accounts.status : null,
    role_name: item.accounts ? item.accounts.role_name : null,
  }));

  return {
    profiles: formattedProfiles,
    totalItems: totalItems,
  };
};

// lấy thông tin chi tiết hồ sơ
export const getProfileDetail = async (profileId) => {
  const profile = await UserProfileModel.getProfileDetailById(profileId);

  // Nếu không tìm thấy hoặc có lỗi
  if (!profile) {
    throw new Error("Không tìm thấy thông tin hồ sơ người dùng hợp lệ!");
  }

  const formattedDetail = {
    profile_id: profile.profile_id,
    account_id: profile.account_id,
    full_name: profile.full_name,
    identity_card: profile.identity_card,
    avatar_url: profile.avatar_url,
    gender: profile.gender,
    dob: profile.dob,
    address: profile.address,
    status: profile.accounts?.status || profile.status,

    email: profile.accounts ? profile.accounts.email : null,
    phone: profile.phone_number,
    role_name: profile.accounts ? profile.accounts.role_name : null,
  };

  return formattedDetail;
};

// cập nhật thông tin tối ưu đồng bộ 2 bảng accounts và user_profiles
export const updateAccount = async (accountId, { email, phone, status }) => {
  const accountUpdateData = {};
  const profileUpdateData = {};

  // 1. Gom dữ liệu cập nhật cho bảng accounts
  if (email) accountUpdateData.email = email; // <-- ĐÃ BỔ SUNG EMAIL VÀO ĐÂY
  if (status) accountUpdateData.status = status;

  // 2. Gom dữ liệu cập nhật đồng bộ cho bảng user_profiles
  if (phone) profileUpdateData.phone_number = phone;
  if (status) profileUpdateData.status = status;

  // 3. Thực thi cập nhật song song vào Database
  const updatePromises = [];

  if (Object.keys(accountUpdateData).length > 0) {
    updatePromises.push(
      AccountModel.updateAccountById(accountId, accountUpdateData),
    );
  }
  if (Object.keys(profileUpdateData).length > 0) {
    updatePromises.push(
      UserProfileModel.updateProfileByAccountId(accountId, profileUpdateData),
    );
  }

  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
  }

  // 4. Lấy lại dữ liệu mới nhất để phản hồi cho client
  const updatedAccount = await UserProfileModel.getAccountById(accountId);

  return {
    message: "Cập nhật thông tin tài khoản và hồ sơ thành công!",
    account: updatedAccount,
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
    AccountModel.getAccountsInRange(from, to),
  ]);

  // Tính toán tổng số trang
  const totalPages = Math.ceil(totalItems / limitNum);

  return {
    accounts,
    pagination: {
      currentPage: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
    },
  };
};

// thay đổ mật khẩu
export const changePassword = async (accountId, oldPassword, newPassword) => {
  if (!oldPassword || !newPassword) {
    throw new Error("Vui lòng cung cấp đầy đủ mật khẩu cũ và mới!");
  }

  // Lấy thông tin tài khoản hiện tại
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new Error("Không tìm thấy tài khoản!");
  }

  // So sánh mật khẩu cũ
  const isMatch = await bcrypt.compare(oldPassword, account.password);
  if (!isMatch) {
    throw new Error("Mật khẩu cũ không chính xác!");
  }

  // 1. Mã hóa mật khẩu mới bằng bcrypt
  const saltRounds = 10;
  const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

  // 2. Chỉ gọi DUY NHẤT lớp Model để cập nhật xuống DB (Không viết lệnh supabase tại đây nữa)
  await AccountModel.updateAccountById(accountId, {
    password: hashedNewPassword,
  });

  return { message: "Đổi mật khẩu mới thành công!" };
};

// Thay đổi trạng thái tài khoản (Toggle active <-> inactive)
export const toggleAccountStatus = async (accountId) => {
  // 1. Kiểm tra tài khoản có tồn tại hay không
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw { status: 404, message: "Tài khoản không tồn tại trên hệ thống!" };
  }

  // 2. Chuyển đổi trạng thái (active <-> inactive)
  const currentStatus = account.status || "active";
  const newStatus = currentStatus === "active" ? "inactive" : "active";

  // 3. Cập nhật đồng bộ trạng thái mới sang cả bảng accounts và user_profiles
  const updatePromises = [
    AccountModel.updateAccountById(accountId, { status: newStatus }),
    UserProfileModel.updateProfileByAccountId(accountId, { status: newStatus }),
  ];

  await Promise.all(updatePromises);

  // 4. Lấy lại dữ liệu mới nhất kèm thông tin trạng thái mới để phản hồi
  const updatedAccount = await UserProfileModel.getAccountById(accountId);

  return {
    account_id: accountId,
    status: newStatus,
    account: updatedAccount,
  };
};

// Lọc và sắp xếp người dùng trước khi phân trang
export const getAdminUsers = async (
  { role, q = "", status = "", sort = "newest", page = 1, limit = 12 },
  exportAll = false,
  authorization,
) => {
  if (!["customer", "staff"].includes(role)) {
    const error = new Error("Vai trò không hợp lệ!");
    error.status = 400;
    throw error;
  }
  if (!["", "active", "inactive"].includes(status)) {
    const error = new Error("Trạng thái không hợp lệ!");
    error.status = 400;
    throw error;
  }
  const allowedSorts = [
    "newest",
    "oldest",
    "az",
    "za",
    ...(role === "customer" ? ["orders_asc", "orders_desc"] : []),
  ];
  if (!allowedSorts.includes(sort)) {
    const error = new Error("Sắp xếp không hợp lệ!");
    error.status = 400;
    throw error;
  }
  page = Number(page);
  limit = Number(limit);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    const error = new Error("Phân trang không hợp lệ!");
    error.status = 400;
    throw error;
  }
  const [profiles, counts] = await Promise.all([
    UserProfileModel.getAdminProfiles(role),
    role === "customer" ? getOrderCounts(authorization) : {},
  ]);
  const query = normalizeSearchValue(q).trim();
  const phoneQuery = query.replace(/\D/g, "");
  const users = profiles
    .map(({ accounts, ...profile }) => ({
      ...profile,
      ...accounts,
      order_count: counts[profile.account_id] || 0,
    }))
    .filter(
      (user) =>
        (!status || user.status === status) &&
        (!query ||
          [user.full_name, user.email, user.phone_number].some((value) =>
            normalizeSearchValue(value).includes(query),
          ) ||
          (phoneQuery.length >= 3 &&
            String(user.phone_number || "").includes(phoneQuery))),
    );
  sortAdminUsers(users, sort);

  const total_items = users.length;
  const total_pages = Math.ceil(total_items / limit);
  page = Math.min(page, total_pages || 1);
  return {
    users: exportAll ? users : users.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, total_items, total_pages },
  };
};

// Cập nhật hồ sơ khách hàng hoặc nhân viên từ trang quản trị
export const updateProfileAll = async (accountId, data, avatarFile) => {
  validateAdminProfile(data);
  const account = await AccountModel.findById(accountId);
  if (!account || !["customer", "staff"].includes(account.role_name)) {
    throw new Error("Không tìm thấy người dùng hợp lệ!");
  }

  return updateStaffProfile(
    accountId,
    { ...data, phone_number: data.phone },
    avatarFile,
    true,
  );
};

// Kiểm tra thông tin hồ sơ trước khi lưu
const validateAdminProfile = (data) => {
  const invalid = (message) => {
    const error = new Error(message);
    error.status = 400;
    throw error;
  };
  if (!String(data.full_name || "").trim()) invalid("Vui lòng nhập họ tên!");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email || "").trim())) {
    invalid("Email không hợp lệ!");
  }
  if (!/^0[0-9]{9}$/.test(String(data.phone || "").trim())) {
    invalid("Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0!");
  }
  if (data.identity_card && !/^[0-9]{12}$/.test(data.identity_card.trim())) {
    invalid("CCCD phải gồm 12 chữ số!");
  }
  if (data.gender && !["Nam", "Nữ", "Khác"].includes(data.gender)) {
    invalid("Giới tính không hợp lệ!");
  }
  if (
    data.dob &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(data.dob) ||
      !Number.isFinite(Date.parse(data.dob)) ||
      new Date(data.dob).toISOString().slice(0, 10) !== data.dob ||
      Date.parse(data.dob) > Date.now())
  ) {
    invalid("Ngày sinh không hợp lệ!");
  }
};

// Chuẩn hóa từ khóa tìm kiếm tiếng Việt
const normalizeSearchValue = (value) => {
  return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
    .toLowerCase();
};

// Sắp xếp tên tiếng Việt, ngày tham gia hoặc tổng đơn hàng
const sortAdminUsers = (users, sort) => {
  const collator = new Intl.Collator("vi", { sensitivity: "base" });
  const getGivenName = (fullName) => {
    return String(fullName || "").trim().split(/\s+/).at(-1);
  };

  users.sort((firstUser, secondUser) => {
    let result;

    if (sort === "az" || sort === "za") {
      result =
        collator.compare(
          getGivenName(firstUser.full_name),
          getGivenName(secondUser.full_name),
        ) ||
        collator.compare(firstUser.full_name || "", secondUser.full_name || "");
      if (sort === "za") result *= -1;
    } else if (sort === "orders_asc" || sort === "orders_desc") {
      result = (firstUser.order_count - secondUser.order_count) *
        (sort === "orders_desc" ? -1 : 1);
    } else {
      result =
        (new Date(firstUser.created_at || 0) - new Date(secondUser.created_at || 0)) *
        (sort === "newest" ? -1 : 1);
    }

    return result || firstUser.profile_id.localeCompare(secondUser.profile_id);
  });
};

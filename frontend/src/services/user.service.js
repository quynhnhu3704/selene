// frontend\src\services\user.service.js
import http from "./http";

// lấy profile
export const getProfile = () => {
  return http.get("/auth/profile");
};

// cập nhật profile
export const updateProfile = (formData) => {
  return http.put("/auth/profile/update", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// đổi mật khẩu
export const changePassword = (data) => {
  return http.patch("/auth/account/change-password", data);
};

// lấy quyền
export const getPermissions = (accountId) => {
  return http.get(`/auth/permissions/${accountId}`);
};

// Lấy danh sách khách hàng
export const getAdminCustomers = (params) => {
  return http.get("/auth/manage/users", {
    params: { ...params, role: "customer" },
  });
};

// Lấy danh sách nhân viên
export const getAdminStaffs = (params) => {
  return http.get("/auth/manage/users", {
    params: { ...params, role: "staff" },
  });
};

// Xuất danh sách theo bộ lọc hiện tại
export const exportAdminUsers = (params) => {
  return http.get("/auth/manage/users/export", {
    params,
    responseType: "blob",
  });
};

// Lấy thông tin chi tiết hồ sơ
export const getAdminUserDetail = (profileId) => {
  return http.get(`/auth/manage/profiles/${encodeURIComponent(profileId)}`);
};

// Thêm khách hàng
export const createAdminCustomer = (data) => {
  return http.post("/auth/manage/customer/add", data);
};

// Thêm nhân viên
export const createAdminStaff = (data) => {
  return http.post("/auth/manage/staff/add", data);
};

// Cập nhật hồ sơ
export const updateAdminUser = (accountId, data) => {
  return http.put(
    `/auth/manage/profiles/update/${encodeURIComponent(accountId)}`,
    data,
  );
};

// Khóa / mở khóa tài khoản
export const toggleAdminUserStatus = (accountId) => {
  return http.put(
    `/auth/manage/account/change-status/${encodeURIComponent(accountId)}`,
  );
};

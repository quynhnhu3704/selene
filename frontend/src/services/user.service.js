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
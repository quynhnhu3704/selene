// backend\auth-service\src\routes\auth.routes.js
import express from "express";
import {
  handleRegister,
  handleLogin,
  handleForgotPassword,
  handleLoginWithGoogle,
  handleRefreshToken,
  handleLogout,
} from "../controllers/auth.controller.js";
import {
  handleGetAdminUsers,
  handleExportAdminUsers,
  handleChangePassword,
  handleCreateStaff,
  handleCreateCustomer,
  handleGetAccounts,
  handleGetCustomerProfile,
  handleGetProfileDetail,
  handleGetProfileList,
  handleUpdateAccount,
  handleUpdateCustomerProfile,
  handleUpdateProfileAll,
  handleUpdateStaffProfile,
  handleGetStaffProfile,
  handleToggleAccountStatus,
} from "../controllers/user.controller.js";
import {
  verifyToken,
  verifyPermission,
} from "../middlewares/auth.middleware.js";
import multer from "multer";
import {
  handleCreatePermission,
  handleGetPermissionMatrix,
  handleSetRolePermission,
  handleGetAllPermissions,
  handleGetPermissionsByAccountId,
  handleUpdatePermission,
  handleTogglePermissionStatus,
} from "../controllers/permission.controller.js";
import { handleToggleRoleStatus } from "../controllers/role.controller.js";

const router = express.Router();
const requireOwner = (req, res, next) => {
  if (Number(req.user?.role_id) !== 1) return res.status(403).json({ status: 403, message: "Chỉ chủ cửa hàng được quản lý quyền và vai trò!" });
  next();
};

// Cấu hình Multer nhận file lưu vào RAM tạm thời
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
});

// authen
router.post("/register", handleRegister);
router.post("/login", handleLogin);
router.post("/logout", handleLogout);
router.post("/forgot-password", handleForgotPassword);
router.get("/google/callback", handleLoginWithGoogle);
router.post("/refresh-token", handleRefreshToken);
router.get("/session/access", verifyToken, (req, res) => {
  res.set("Cache-Control", "no-store");
  const { accountId, role_id, role, permissions, exp } = req.user;
  res.json({ status: 200, data: { accountId, role_id, role, permissions, exp } });
});

// user - customer
router.put(
  "/profile/update",
  verifyToken,
  upload.single("avatar_url"),
  handleUpdateCustomerProfile,
);
router.get(
  "/permissions/:accountId",
  verifyToken,
  handleGetPermissionsByAccountId,
);
router.patch("/account/change-password", verifyToken, handleChangePassword);
router.get("/profile", verifyToken, handleGetCustomerProfile);

// user - staff
router.get(
  "/staff/profile",
  verifyToken,
  verifyPermission("user:view"),
  handleGetStaffProfile,
);
router.put(
  "/staff/profile/update",
  verifyToken,
  verifyPermission("user:update"),
  upload.single("avatar_url"),
  handleUpdateStaffProfile,
);

router.get(
  "/manage/users",
  verifyToken,
  verifyPermission("profile:view"),
  handleGetAdminUsers,
);
router.get(
  "/manage/users/export",
  verifyToken,
  verifyPermission("profile:view"),
  handleExportAdminUsers,
);

// user - admin
// khách hàng
router.post(
  "/manage/customer/add",
  verifyToken,
  verifyPermission("user:create"),
  upload.single("avatar_url"),
  handleCreateCustomer,
);

// nhân viên
router.post(
  "/manage/staff/add",
  verifyToken,
  verifyPermission("user:create"),
  upload.single("avatar_url"),
  handleCreateStaff,
);
router.get(
  "/manage/profiles",
  verifyToken,
  verifyPermission("profile:view"),
  handleGetProfileList,
);
router.get(
  "/manage/profiles/:profileId",
  verifyToken,
  verifyPermission("profile:view"),
  handleGetProfileDetail,
);
router.put(
  "/manage/profiles/update/:accountId",
  verifyToken,
  verifyPermission("profile:update"),
  upload.single("avatar_url"),
  handleUpdateProfileAll,
);

// quyền (permission)
router.get("/manage/permission-matrix", verifyToken, handleGetPermissionMatrix);
router.put(
  "/manage/roles/:roleId/permissions/:permissionId",
  verifyToken,
  handleSetRolePermission,
);

router.get(
  "/manage/permissions",
  verifyToken,
  requireOwner,
  verifyPermission("permission:view"),
  handleGetAllPermissions,
);
router.post(
  "/manage/permission/add",
  verifyToken,
  requireOwner,
  verifyPermission("permission:create"),
  handleCreatePermission,
);
router.put(
  "/manage/permission/update/:permissionId",
  verifyToken,
  requireOwner,
  verifyPermission("permission:update"),
  handleUpdatePermission,
);
router.put(
  "/manage/permission/change-status/:permissionId",
  verifyToken,
  requireOwner,
  verifyPermission("permission:update"),
  handleTogglePermissionStatus,
);

// vai trò (role)
router.put(
  "/manage/role/change-status/:roleId",
  verifyToken,
  requireOwner,
  verifyPermission("role:update"),
  handleToggleRoleStatus,
);

// account
router.put(
  "/manage/account/update/:accountId",
  verifyToken,
  verifyPermission("user:update"),
  handleUpdateAccount,
);
router.put(
  "/manage/account/change-status/:accountId",
  verifyToken,
  verifyPermission("user:update"),
  handleToggleAccountStatus,
);
router.get(
  "/manage/accounts",
  verifyToken,
  verifyPermission("user:view"),
  handleGetAccounts,
);

export default router;

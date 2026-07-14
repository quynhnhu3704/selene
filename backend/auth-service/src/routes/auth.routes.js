// backend\auth-service\src\routes\auth.routes.js
import express from 'express';
import { handleRegister, handleLogin, handleForgotPassword, handleLoginWithGoogle, handleRefreshToken, handleLogout } from '../controllers/auth.controller.js';
import { handleChangePassword, handleCreateStaff, handleGetAccounts, handleGetCustomerProfile, handleGetProfileDetail, handleGetProfileList, handleUpdateAccount, handleUpdateCustomerProfile, handleUpdateProfileAll, handleUpdateStaffProfile, handleGetStaffProfile } from '../controllers/user.controller.js';
import { verifyToken, verifyPermission } from '../middlewares/auth.middleware.js';
import multer from 'multer';
import { handleCreatePermission, handleGetAllPermissions, handleGetPermissionsByAccountId, handleUpdatePermission } from '../controllers/permission.controller.js';

const router = express.Router();

// Cấu hình Multer nhận file lưu vào RAM tạm thời
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn 5MB
});


// authen
router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/logout', handleLogout);
router.post('/forgot-password', handleForgotPassword);
router.get('/google/callback', handleLoginWithGoogle);
router.post('/refresh-token', handleRefreshToken);


// user - customer
router.put('/profile/update', verifyToken, upload.single('avatar_url'), handleUpdateCustomerProfile);
router.get('/permissions/:accountId', verifyToken, handleGetPermissionsByAccountId);
router.patch('/account/change-password', verifyToken, handleChangePassword);
router.get('/profile', verifyToken, handleGetCustomerProfile);


// user - staff
router.get('/staff/profile', verifyToken, verifyPermission('user:view'),  handleGetStaffProfile);
router.put('/staff/profile/update', verifyToken, verifyPermission('user:update'), upload.single('avatar_url'), handleUpdateStaffProfile);


// user - admin
// nhân viên
router.post('/manage/staff/add', verifyToken, verifyPermission('user:create'), upload.single('avatar_url'), handleCreateStaff);
router.get('/manage/profiles', verifyToken, verifyPermission('profile:view'), handleGetProfileList);
router.get('/manage/profiles/:profileId', verifyToken, verifyPermission('profile:view'), handleGetProfileDetail);
router.put('/manage/profiles/update/:accountId', verifyToken, verifyPermission('profile:update'), upload.single('avatar_url'), handleUpdateProfileAll);

// quyền
router.get('/manage/permissions', verifyToken, verifyPermission('permission:view'), handleGetAllPermissions);
router.post('/manage/permission/add', verifyToken, verifyPermission('permission:create'), handleCreatePermission);
router.put('/manage/permission/update/:permissionId', verifyToken, verifyPermission('permission:update'), handleUpdatePermission);

// account
router.put('/manage/account/update/:accountId', verifyToken, verifyPermission('user:update'), handleUpdateAccount);
router.get('/manage/accounts', verifyToken, verifyPermission('user:view'), handleGetAccounts);


export default router;
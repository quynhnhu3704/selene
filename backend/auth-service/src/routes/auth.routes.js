import express from 'express';
import { handleRegister, handleLogin, handleForgotPassword, handleLoginWithGoogle, handleRefreshToken } from '../controllers/auth.controller.js';
import { handleCreateStaff, handleGetProfileDetail, handleGetProfileList, handleUpdateCustomerProfile, handleUpdateProfileAll } from '../controllers/user.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import multer from 'multer';
import { handleGetPermissionsByAccountId } from '../controllers/permission.controller.js';

const router = express.Router();

// Cấu hình Multer nhận file lưu vào RAM tạm thời
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn 5MB
});


// authen
router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/forgot-password', handleForgotPassword);
router.get('/google/callback', handleLoginWithGoogle);
router.post('/refresh-token', handleRefreshToken);


// user - customer
router.put('/profile/update', verifyToken, upload.single('avatar_url'), handleUpdateCustomerProfile);
router.get('/permissions/:accountId', verifyToken, handleGetPermissionsByAccountId);


// user - admin
router.post('/manage/staff/add', verifyToken, upload.single('avatar_url'), handleCreateStaff);
router.get('/manage/profiles', verifyToken, handleGetProfileList);
router.get('/manage/profiles/:profileId', verifyToken, handleGetProfileDetail);
router.put('/manage/profiles/update/:accountId', verifyToken, upload.single('avatar_url'), handleUpdateProfileAll);

export default router;
import express from 'express';
import { handleRegister, handleLogin, handleForgotPassword, handleLoginWithGoogle } from '../controllers/auth.controller.js';
import { handleUpdateCustomerProfile } from '../controllers/user.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import multer from 'multer';

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


// user 
router.put('/profile/update', verifyToken, upload.single('avatar_url'), handleUpdateCustomerProfile);

export default router;
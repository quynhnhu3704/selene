import express from 'express';
import { handleRegister, handleLogin, handleForgotPassword, handleLoginWithGoogle } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/forgot-password', handleForgotPassword);
router.get('/google/callback', handleLoginWithGoogle);

export default router;
import express from 'express';
import { handleRegister, handleLogin, handleForgotPassword } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/forgot-password', handleForgotPassword);

export default router;
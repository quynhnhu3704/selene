import express from 'express';
import { handleRegister, handleLogin } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', handleRegister);
router.post('/login', handleLogin);

export default router;
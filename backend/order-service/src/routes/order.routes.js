import express from 'express';
import * as cartController from '../controllers/cart.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// customer
// cart
router.post('/cart/add', verifyToken, cartController.handleAddItemToCart);

export default router;
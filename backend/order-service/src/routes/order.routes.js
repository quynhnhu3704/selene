import express from 'express';
import * as cartController from '../controllers/cart.controller.js';
import { verifyToken, verifyPermission } from '../middlewares/auth.middleware.js';

const router = express.Router();

// customer
// cart
router.post('/cart/add', verifyToken, verifyPermission('cart:add'), cartController.handleAddItemToCart);

export default router;
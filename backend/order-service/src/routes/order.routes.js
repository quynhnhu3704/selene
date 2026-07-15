// backend\order-service\src\routes\order.routes.js
import express from 'express';
import * as cartController from '../controllers/cart.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// customer
// cart
router.post('/cart/add', verifyToken, cartController.handleAddItemToCart);
router.get('/cart', verifyToken, cartController.handleGetCart);
router.delete('/cart/remove/:cartItemId', verifyToken, cartController.handleRemoveItemFromCart);

export default router;
import express from 'express';
// import { orderController } from '../controllers/product.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

// router.get('/', requireAuth, orderController.getOrders);

export default router;

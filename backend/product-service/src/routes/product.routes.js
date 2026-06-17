import express from 'express';
import * as productController from '../controllers/product.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/product-list', productController.handleGetAllProducts);

export default router;

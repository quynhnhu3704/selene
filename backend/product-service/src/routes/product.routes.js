import express from 'express';
import * as productController from '../controllers/product.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/product-list', productController.handleGetAllProducts);
router.get('/product-detail/:id', productController.handleGetProductDetail);
router.get('/product-search', productController.handleSearchProductsByName);
router.get('/category-search', productController.handleSearchProductsByCategory);

export default router;

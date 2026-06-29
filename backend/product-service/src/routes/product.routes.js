import express from 'express';
import * as productController from '../controllers/product.controller.js';
import * as categoryController from '../controllers/category.controller.js';
import * as brandController from '../controllers/brand.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/product-list', productController.handleGetAllProducts);
router.get('/product-detail/:id', productController.handleGetProductDetail);
router.get('/product-search', productController.handleSearchProductsByName);
router.get('/category-search', productController.handleSearchProductsByCategory);

// admin
// category
router.post('/manage/category/add', verifyToken, categoryController.handleCreateCategory);
router.put('/manage/category/update/:categoryId', verifyToken, categoryController.handleUpdateCategory);
router.get('/manage/categories', verifyToken, categoryController.handleGetAllCategories);

// brand
router.get('/manage/brands', verifyToken, brandController.handleGetAllBrands);

export default router;

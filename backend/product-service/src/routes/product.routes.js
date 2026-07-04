// backend\product-service\src\models\product.model.js
import express from 'express';
import * as productController from '../controllers/product.controller.js';
import * as categoryController from '../controllers/category.controller.js';
import * as brandController from '../controllers/brand.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import multer from 'multer';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn kích thước mỗi ảnh 5MB
});

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
router.post('/manage/brand/add', verifyToken, brandController.handleCreateBrand);
router.put('/manage/brand/update/:brandId', verifyToken, brandController.handleUpdateBrand);

// product
router.post('/manage/product/add', verifyToken, upload.array('images', 10), productController.handleCreateProduct);

export default router;

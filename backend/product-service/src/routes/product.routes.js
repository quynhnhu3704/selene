// backend\product-service\src\models\product.model.js
import express from 'express';
import * as productController from '../controllers/product.controller.js';
import * as categoryController from '../controllers/category.controller.js';
import * as brandController from '../controllers/brand.controller.js';
import { verifyToken, verifyRole } from '../middlewares/auth.middleware.js';
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
router.post('/manage/category/add', verifyToken, verifyRole(['admin', 'staff']), categoryController.handleCreateCategory);
router.put('/manage/category/update/:categoryId', verifyToken, verifyRole(['admin', 'staff']), categoryController.handleUpdateCategory);
router.get('/manage/categories', verifyToken, verifyRole(['admin', 'staff']), categoryController.handleGetAllCategories);

// brand
router.get('/manage/brands', verifyToken, verifyRole(['admin', 'staff']), brandController.handleGetAllBrands);
router.post('/manage/brand/add', verifyToken, verifyRole(['admin', 'staff']), brandController.handleCreateBrand);
router.put('/manage/brand/update/:brandId', verifyToken, verifyRole(['admin', 'staff']), brandController.handleUpdateBrand);

// product
router.post('/manage/product/add', verifyToken, verifyRole(['admin', 'staff']), upload.array('images', 10), productController.handleCreateProduct);
router.put('/manage/product/update/:productId', verifyToken, verifyRole(['admin', 'staff']), upload.array('images', 10), productController.handleUpdateProduct);
router.get('/manage/products', verifyToken, verifyRole(['admin', 'staff']), productController.handleGetAllProductsForAdmin)
router.get('/manage/product-detail/:productId', verifyToken, verifyRole(['admin', 'staff']), productController.handleGetProductDetailForAdmin);

export default router;

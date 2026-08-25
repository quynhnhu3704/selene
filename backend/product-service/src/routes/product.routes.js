// backend\product-service\src\routes\product.routes.js
import express from "express";
import * as productController from "../controllers/product.controller.js";
import * as categoryController from "../controllers/category.controller.js";
import * as brandController from "../controllers/brand.controller.js";
import {
  verifyToken,
  verifyPermission,
} from "../middlewares/auth.middleware.js";
import multer from "multer";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn kích thước mỗi ảnh 5MB
});

router.get("/product-list", productController.handleGetAllProducts);
router.get(
  "/product-filters",
  productController.handleGetCustomerProductFilters,
);
router.get("/product-detail/:id", productController.handleGetProductDetail);
router.get("/product-search", productController.handleSearchProductsByName);
router.get(
  "/category-search",
  productController.handleSearchProductsByCategory,
);

// admin
// category
router.post(
  "/manage/category/add",
  verifyToken,
  verifyPermission("category:create"),
  categoryController.handleCreateCategory,
);
router.put(
  "/manage/category/update/:categoryId",
  verifyToken,
  verifyPermission("category:update"),
  categoryController.handleUpdateCategory,
);
router.put(
  "/manage/category/change-status/:categoryId",
  verifyToken,
  verifyPermission("category:update"),
  categoryController.handleUpdateCategoryStatus,
);
router.get(
  "/manage/categories",
  verifyToken,
  verifyPermission("category:view"),
  categoryController.handleGetAllCategories,
);
router.get(
  "/manage/product-categories",
  verifyToken,
  verifyPermission("product:view"),
  categoryController.handleGetCategoriesForProductFilter,
);

// brand
router.get(
  "/manage/brands",
  verifyToken,
  verifyPermission("brand:view"),
  brandController.handleGetAllBrands,
);
router.post(
  "/manage/brand/add",
  verifyToken,
  verifyPermission("brand:create"),
  brandController.handleCreateBrand,
);
router.put(
  "/manage/brand/update/:brandId",
  verifyToken,
  verifyPermission("brand:update"),
  brandController.handleUpdateBrand,
);

// product
router.post(
  "/manage/product/add",
  verifyToken,
  verifyPermission("product:create"),
  upload.array("images", 10),
  productController.handleCreateProduct,
);
router.put(
  "/manage/product/update/:productId",
  verifyToken,
  verifyPermission("product:update"),
  upload.array("images", 10),
  productController.handleUpdateProduct,
);
router.put(
  "/manage/product/change-status/:productId",
  verifyToken,
  verifyPermission("product:update"),
  productController.handleUpdateProductStatus,
);
router.put(
  "/manage/variant/change-status/:variantId",
  verifyToken,
  verifyPermission("product:update"),
  productController.handleUpdateVariantStatus,
);
router.get(
  "/manage/products",
  verifyToken,
  verifyPermission("product:view"),
  productController.handleGetAllProductsForAdmin,
);
router.get(
  "/manage/product-detail/:productId",
  verifyToken,
  verifyPermission("product:view"),
  productController.handleGetProductDetailForAdmin,
);

export default router;

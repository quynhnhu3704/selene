// backend\order-service\src\routes\order.routes.js
import express from 'express';
import * as cartController from '../controllers/cart.controller.js';
import * as voucherController from '../controllers/voucher.controller.js';
import { verifyToken, verifyPermission } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ================= VOUCHER =================
router.post('/vouchers/add', verifyToken, verifyPermission('voucher:create'), voucherController.createVoucher);
router.get('/vouchers', verifyToken, verifyPermission('voucher:view'), voucherController.getAllVouchers);
router.get('/vouchers/:voucherId', verifyToken, verifyPermission('voucher:view'), voucherController.getVoucherById);
router.get('/vouchers/code/:code', verifyToken, voucherController.getVoucherByCode);
router.put('/vouchers/update/:voucherId', verifyToken, verifyPermission('voucher:update'), voucherController.updateVoucher);

// ================= VOUCHER USAGES =================
router.post('/vouchers/apply', verifyToken, voucherController.applyVoucher);
router.get('/vouchers/:voucherId/usages', verifyToken, verifyPermission('voucher:view'), voucherController.getVoucherUsagesByVoucherId);
router.get('/vouchers/account/:accountId/usages', verifyToken, voucherController.getVoucherUsagesByAccountId);

// ================= CART (CUSTOMER) =================
router.post('/cart/add', verifyToken, cartController.handleAddItemToCart);
router.get('/cart', verifyToken, cartController.handleGetCart);
router.delete('/cart/remove/:cartItemId', verifyToken, cartController.handleRemoveItemFromCart);
router.put('/cart/decrease/:cartItemId', verifyToken, cartController.handleDecreaseItemQuantity);
router.put('/cart/increase/:cartItemId', verifyToken, cartController.handleIncreaseItemQuantity);

export default router;
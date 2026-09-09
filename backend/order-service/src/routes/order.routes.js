// backend\order-service\src\routes\order.routes.js
import express from "express";
import * as cartController from "../controllers/cart.controller.js";
import * as voucherController from "../controllers/voucher.controller.js";
import * as orderController from "../controllers/order.controller.js";
import {
  verifyToken,
  verifyPermission,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

// ================= ADMIN =================
router.get(
  "/manage/orders",
  verifyToken,
  verifyPermission("order:view"),
  orderController.handleGetAllOrdersForAdmin,
);
router.get(
  "/manage/orders/:orderId",
  verifyToken,
  verifyPermission("order:view"),
  orderController.handleGetOrderByIdForAdmin,
);
router.put(
  "/manage/orders/:orderId/confirm",
  verifyToken,
  verifyPermission("order:update"),
  orderController.handleConfirmSingleOrder,
);
router.put(
  "/manage/orders/confirm",
  verifyToken,
  verifyPermission("order:update"),
  orderController.handleConfirmOrdersBulk,
);

// ================= VOUCHER =================
router.post(
  "/manage/vouchers/add",
  verifyToken,
  verifyPermission("voucher:create"),
  voucherController.createVoucher,
);
router.get(
  "/manage/vouchers",
  verifyToken,
  verifyPermission("voucher:view"),
  voucherController.getAllVouchers,
);
router.get(
  "/manage/vouchers/:voucherId",
  verifyToken,
  verifyPermission("voucher:view"),
  voucherController.getVoucherById,
);
router.put(
  "/manage/vouchers/update/:voucherId",
  verifyToken,
  verifyPermission("voucher:update"),
  voucherController.updateVoucher,
);

// ================= VOUCHER USAGES =================
router.post("/vouchers/apply", verifyToken, voucherController.applyVoucher);
router.get(
  "/vouchers/:voucherId/usages",
  verifyToken,
  verifyPermission("voucher:view"),
  voucherController.getVoucherUsagesByVoucherId,
);
router.get(
  "/vouchers/account/:accountId/usages",
  verifyToken,
  voucherController.getVoucherUsagesByAccountId,
);

// ================= CUSTOMER =================

// ================= ORDER (CUSTOMER) =================
router.post("/sepay-webhook", orderController.handleSePayWebhook);
router.post(
  "/place-order",
  verifyToken,
  verifyPermission("order:create"),
  orderController.handleCreateOrder,
);
router.get(
  "/order-list",
  verifyToken,
  verifyPermission("order:view"),
  orderController.handleGetOrders,
);
router.get(
  "/order/:orderId",
  verifyToken,
  verifyPermission("order:view"),
  orderController.handleGetOrderById,
);
router.put(
  "/order/:orderId/pay",
  verifyToken,
  orderController.handleConfirmPayment,
);
router.put(
  "/order/:orderId/cancel",
  verifyToken,
  orderController.handleCancelOrder,
);

// ================= CART (CUSTOMER) =================
router.post("/cart/add", verifyToken, cartController.handleAddItemToCart);
router.get("/cart", verifyToken, cartController.handleGetCart);
router.delete(
  "/cart/remove/:cartItemId",
  verifyToken,
  cartController.handleRemoveItemFromCart,
);
router.put(
  "/cart/decrease/:cartItemId",
  verifyToken,
  cartController.handleDecreaseItemQuantity,
);
router.put(
  "/cart/increase/:cartItemId",
  verifyToken,
  cartController.handleIncreaseItemQuantity,
);

// ================= VOUCHER =================
router.get("/vouchers", verifyToken, voucherController.getCustomerVouchers);
router.get(
  "/vouchers/code/:code",
  verifyToken,
  voucherController.getVoucherByCode,
);
export default router;

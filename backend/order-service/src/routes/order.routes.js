// backend\order-service\src\routes\order.routes.js
import express from "express";
import * as cartController from "../controllers/cart.controller.js";
import * as voucherController from "../controllers/voucher.controller.js";
import * as orderController from "../controllers/order.controller.js";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { getSupportOrders } from "../controllers/support.controller.js";
import {
  verifyToken,
  verifyPermission,
} from "../middlewares/auth.middleware.js";

const router = express.Router();
router.get("/internal/support/orders", getSupportOrders);

const verifyOrderManager = (req, res, next) => {
  if (!["admin", "staff"].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền quản lý đơn hàng!",
    });
  }
  next();
};

// ================= ADMIN =================
router.get(
  "/manage/dashboard",
  verifyToken,
  verifyOrderManager,
  verifyPermission("order:view"),
  dashboardController.handleGetDashboardStatistics,
);
router.get(
  "/manage/user-order-counts",
  verifyToken,
  verifyPermission("profile:view"),
  orderController.handleGetUserOrderCounts,
);
router.get(
  "/manage/orders",
  verifyToken,
  verifyOrderManager,
  verifyPermission("order:view"),
  orderController.handleGetAllOrdersForAdmin,
);
router.get(
  "/manage/orders/export",
  verifyToken,
  verifyOrderManager,
  verifyPermission("order:view"),
  orderController.handleExportOrders,
);
router.post(
  "/manage/orders",
  verifyToken,
  verifyOrderManager,
  verifyPermission("order:create"),
  orderController.handleCreateOrderForAdmin,
);
router.get(
  "/manage/orders/:orderId",
  verifyToken,
  verifyOrderManager,
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
router.put(
  "/manage/orders/:orderId",
  verifyToken,
  verifyOrderManager,
  verifyPermission("order:update"),
  orderController.handleUpdateOrderForAdmin,
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

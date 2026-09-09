// backend/order-service/src/controllers/order.controller.js
import * as orderService from "../services/order.service.js";
import crypto from "crypto";
import { config } from "../configs/index.js";

export const handleCreateOrder = async (req, res) => {
  try {
    const accountId = req.user.accountId; // Lấy từ middleware verifyToken
    const orderData = req.body;

    const newOrder = await orderService.createOrder(accountId, orderData);

    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công!",
      data: newOrder,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const handleGetOrders = async (req, res) => {
  try {
    const accountId = req.user.accountId; // Lấy từ middleware verifyToken

    const orders = await orderService.getOrdersByAccountId(accountId);

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đơn hàng thành công!",
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const handleGetAllOrdersForAdmin = async (req, res) => {
  try {
    const orders = await orderService.getAllOrdersForAdmin();

    res.status(200).json({
      success: true,
      message: "Lấy danh sách đơn hàng cho admin thành công!",
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const handleGetOrderByIdForAdmin = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderService.getOrderByIdForAdmin(orderId);

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết đơn hàng cho admin thành công!",
      data: order,
    });
  } catch (error) {
    const status = error.message === "Không tìm thấy đơn hàng!" ? 404 : 500;

    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

export const handleGetOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(
      req.user.accountId,
      req.params.orderId,
    );

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    const status = error.message === "Không tìm thấy đơn hàng!" ? 404 : 500;

    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

const extractOrderCode = (payload) => {
  const textToSearch = [
    payload?.content,
    payload?.description,
    payload?.code,
    payload?.referenceCode,
  ]
    .filter(Boolean)
    .join(" ");

  // 1. Khớp mã đơn dạng liền: HD1740751234567abc123
  const matchCompact = textToSearch.match(/HD\d{13}[a-z0-9]{6}/i);
  if (matchCompact) {
    return matchCompact[0];
  }

  // 2. Khớp mã đơn có gạch nối: HD-1740751234567-abc123
  const matchHyphen = textToSearch.match(/HD-\d+-[a-z0-9]+/i);
  if (matchHyphen) {
    return matchHyphen[0];
  }

  // 3. Khớp bất kỳ mã đơn nào bắt đầu bằng HD
  const matchGeneric = textToSearch.match(/HD[a-z0-9-]+/i);
  if (matchGeneric) {
    return matchGeneric[0];
  }

  return null;
};

const isValidWebhookAuthorization = (authorization) => {
  const apiKey = config.sepayWebhookApiKey;

  // Nếu môi trường dev / chưa cấu hình SEPAY_WEBHOOK_API_KEY trong env, chấp nhận webhook
  if (!apiKey) {
    return true;
  }

  const received = String(authorization || "").trim();
  const expectedPattern1 = `Apikey ${apiKey}`;
  const expectedPattern2 = apiKey;
  const expectedPattern3 = `Bearer ${apiKey}`;

  return (
    received === expectedPattern1 ||
    received === expectedPattern2 ||
    received === expectedPattern3
  );
};

export const handleSePayWebhook = async (req, res) => {
  if (!isValidWebhookAuthorization(req.get("authorization"))) {
    return res.status(401).json({ success: false });
  }

  try {
    const { transferType, transferAmount } = req.body || {};
    const orderCode = extractOrderCode(req.body);

    // SePay có thể gửi giao dịch ra, giao dịch không khớp, hoặc retry cùng payload.
    // Các trường hợp này vẫn phải được ACK để SePay không retry vô hạn.
    if (transferType !== "in" || !orderCode) {
      return res.status(200).json({ success: true });
    }

    await orderService.confirmSePayPayment({
      orderCode,
      transferAmount,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Lỗi tại SePay webhook:", error.message);
    return res.status(500).json({ success: false });
  }
};

export const handleConfirmPayment = async (req, res) => {
  try {
    const updatedOrder = await orderService.markOrderAsPaid(req.params.orderId);
    res.status(200).json({
      success: true,
      message: "Cập nhật thanh toán thành công!",
      data: updatedOrder,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const handleConfirmSingleOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status = "confirmed" } = req.body || {};

    const result = await orderService.confirmOrdersBulk(
      [orderId],
      status,
      "pending",
    );

    if (result.updatedCount === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Không thể duyệt đơn hàng! Đơn hàng không tồn tại hoặc trạng thái hiện tại không phải 'Chờ xác nhận' (pending).",
      });
    }

    res.status(200).json({
      success: true,
      message: "Duyệt đơn hàng thành công!",
      data: result.updatedOrders[0],
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const handleConfirmOrdersBulk = async (req, res) => {
  try {
    const { orderIds, status = "confirmed" } = req.body || {};

    let result;
    // Nếu truyền danh sách orderIds cụ thể -> Cập nhật cho các đơn đó (với điều kiện đang ở trạng thái pending)
    if (Array.isArray(orderIds) && orderIds.length > 0) {
      result = await orderService.confirmOrdersBulk(
        orderIds,
        status,
        "pending",
      );
    } else {
      // Nếu KHÔNG truyền orderIds -> Cập nhật TẤT CẢ các đơn hàng hiện đang ở trạng thái pending sang confirmed
      result = await orderService.confirmAllPendingOrders(status);
    }

    res.status(200).json({
      success: true,
      message: `Đã duyệt thành công ${result.updatedCount} đơn hàng ở trạng thái Chờ xác nhận (pending)!`,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const handleCancelOrder = async (req, res) => {
  try {
    const accountId = req.user.accountId;
    const { orderId } = req.params;

    const updatedOrder = await orderService.cancelOrder(accountId, orderId);

    res.status(200).json({
      success: true,
      message: "Hủy đơn hàng thành công!",
      data: updatedOrder,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

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

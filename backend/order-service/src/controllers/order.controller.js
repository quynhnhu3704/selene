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
  const content = String(payload?.content || "");
  const codeFromContent = content.match(/HD-\d+-[a-z0-9]+/i)?.[0];

  if (codeFromContent) return codeFromContent;

  // Một số ngân hàng có thể bỏ dấu gạch nối trong nội dung chuyển khoản.
  const compactCode = content.match(/HD(\d{13})([a-z0-9]{6})/i);
  if (compactCode) {
    return `HD-${compactCode[1]}-${compactCode[2]}`;
  }

  // `code` của SePay thường là mã giao dịch của ngân hàng, không phải mã đơn.
  // Chỉ dùng nó khi nó đúng định dạng mã đơn của Selene.
  const code = String(payload?.code || "").trim();
  return /^HD-\d+-[a-z0-9]+$/i.test(code) ? code : null;
};

const isValidWebhookAuthorization = (authorization) => {
  const apiKey = config.sepayWebhookApiKey;
  const expected = apiKey ? `Apikey ${apiKey}` : "";
  const received = authorization || "";

  if (!expected || expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
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

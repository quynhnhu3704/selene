// backend/order-service/src/controllers/order.controller.js
import * as orderService from '../services/order.service.js';

export const handleCreateOrder = async (req, res) => {
  try {
    const accountId = req.user.accountId; // Lấy từ middleware verifyToken
    const orderData = req.body;
    
    const newOrder = await orderService.createOrder(accountId, orderData);
    
    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công!',
      data: newOrder
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const handleGetOrders = async (req, res) => {
  try {
    const accountId = req.user.accountId; // Lấy từ middleware verifyToken
    
    const orders = await orderService.getOrdersByAccountId(accountId);
    
    res.status(200).json({
      success: true,
      message: 'Lấy danh sách đơn hàng thành công!',
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
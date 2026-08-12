// backend/order-service/src/controllers/order.controller.js
import * as orderService from '../services/order.service.js';

export const handlePlaceOrder = async (req, res) => {
  try {
    const accountId = req.user.accountId; // Lấy từ middleware verifyToken
    const orderData = req.body;
    
    const newOrder = await orderService.placeOrder(accountId, orderData);
    
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
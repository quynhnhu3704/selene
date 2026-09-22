import * as supportService from "../services/support.service.js";

// Chỉ chat-service được lấy ngữ cảnh đơn hàng sau khi đã kiểm tra quyền hội thoại.
export const getSupportOrders = async (req, res, next) => {
  try {
    const data = await supportService.getSupportOrders(req.headers.authorization?.split(" ")[1]);
    res.json({ status: 200, data });
  } catch (error) { next(error); }
};

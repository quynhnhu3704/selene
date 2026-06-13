import { orderService } from '../services/order.service.js';

export const orderController = {
  getOrders: async (req, res, next) => {
    try {
      const orders = await orderService.getOrders();
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }
};

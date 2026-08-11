// backend\order-service\src\controllers\voucher.controller.js
import { VoucherService } from '../services/voucher.service.js';

// Controller xử lý request tạo mới voucher và trả về kết quả
export const createVoucher = async (req, res, next) => {
  try {
    const voucher = await VoucherService.createVoucher(req.body);
    res.status(201).json({
      status: 201,
      message: 'Tạo voucher thành công',
      data: voucher
    });
  } catch (error) {
    next(error);
  }
};

// Controller lấy danh sách tất cả các voucher có phân trang
export const getAllVouchers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        status: 400,
        message: 'Tham số phân trang page hoặc limit không hợp lệ!'
      });
    }

    const result = await VoucherService.getAllVouchers(page, limit);
    res.status(200).json({
      status: 200,
      message: 'Lấy danh sách voucher thành công',
      data: result.vouchers,
      pagination: {
        currentPage: page,
        limit: limit,
        totalItems: result.totalItems
      }
    });
  } catch (error) {
    next(error);
  }
};

// Controller lấy chi tiết một voucher theo ID truyền trên params
export const getVoucherById = async (req, res, next) => {
  try {
    const voucher = await VoucherService.getVoucherById(req.params.voucherId);
    res.status(200).json({
      status: 200,
      message: 'Lấy thông tin voucher thành công',
      data: voucher
    });
  } catch (error) {
    next(error);
  }
};

// Controller tìm voucher bằng mã code (dùng khi khách hàng nhập mã giảm giá)
export const getVoucherByCode = async (req, res, next) => {
  try {
    const voucher = await VoucherService.getVoucherByCode(req.params.code);
    
    const now = new Date();
    // Nếu voucher đã hết hạn sử dụng
    if (now > new Date(voucher.end_date)) {
      return res.status(200).json({
        status: 200,
        message: 'Voucher đã hết hạn sử dụng.',
        data: {
          voucher_id: voucher.voucher_id,
          code: voucher.code,
          name: voucher.name
        }
      });
    }

    // Nếu voucher có giới hạn số lượng và đã dùng hết
    if (voucher.total_quantity > 0 && voucher.used_quantity >= voucher.total_quantity) {
      return res.status(200).json({
        status: 200,
        message: 'Voucher đã hết lượt sử dụng.',
        data: {
          voucher_id: voucher.voucher_id,
          code: voucher.code,
          name: voucher.name
        }
      });
    }

    // Chỉ trả về những trường cần thiết cho Frontend
    const filteredVoucher = {
      voucher_id: voucher.voucher_id,
      code: voucher.code,
      name: voucher.name,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      min_order_value: voucher.min_order_value,
      max_discount_amount: voucher.max_discount_amount
    };

    res.status(200).json({
      status: 200,
      message: 'Lấy thông tin voucher thành công',
      data: filteredVoucher
    });
  } catch (error) {
    next(error);
  }
};

// Controller xử lý cập nhật thông tin voucher
export const updateVoucher = async (req, res, next) => {
  try {
    const voucher = await VoucherService.updateVoucher(req.params.voucherId, req.body);
    res.status(200).json({
      status: 200,
      message: 'Cập nhật thông tin voucher thành công',
      data: voucher
    });
  } catch (error) {
    next(error);
  }
};


// Controller nhận request áp dụng voucher vào đơn hàng
export const applyVoucher = async (req, res, next) => {
  try {
    const { voucherId, accountId, orderId, orderValue } = req.body;
    const result = await VoucherService.applyVoucher(voucherId, accountId, orderId, orderValue);
    res.status(200).json({
      status: 200,
      message: 'Áp dụng voucher thành công',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Controller lấy lịch sử sử dụng của một mã voucher (Admin xem)
export const getVoucherUsagesByVoucherId = async (req, res, next) => {
  try {
    const usages = await VoucherService.getVoucherUsagesByVoucherId(req.params.voucherId);
    res.status(200).json({
      status: 200,
      message: 'Lấy lịch sử sử dụng voucher thành công',
      data: usages
    });
  } catch (error) {
    next(error);
  }
};

// Controller lấy danh sách các voucher mà tài khoản đã dùng
export const getVoucherUsagesByAccountId = async (req, res, next) => {
  try {
    const usages = await VoucherService.getVoucherUsagesByAccountId(req.params.accountId);
    res.status(200).json({
      status: 200,
      message: 'Lấy danh sách voucher đã dùng thành công',
      data: usages
    });
  } catch (error) {
    next(error);
  }
};

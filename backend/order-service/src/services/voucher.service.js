import { VoucherModel } from '../models/voucher.model.js';
import crypto from 'crypto';

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

export const VoucherService = {
  // Xử lý logic tạo mới một voucher (kiểm tra trùng mã code và sinh UUID tự động)
  createVoucher: async (voucherData) => {
    // Check if code exists
    const existing = await VoucherModel.findByCode(voucherData.code);
    if (existing) {
      throw new Error(`Voucher code ${voucherData.code} đã tồn tại`);
    }

     const voucher_id = 'voucher-' + generateId();

    const dataToCreate = {
      voucher_id: voucher_id,
      ...voucherData,
      created_at: new Date()
    };
    return await VoucherModel.create(dataToCreate);
  },

  // Lấy toàn bộ danh sách voucher có phân trang
  getAllVouchers: async (page, limit) => {
    let totalItems = 0;
    try {
      totalItems = await VoucherModel.countVouchers();
    } catch (error) {
      throw new Error(`Lỗi đếm số lượng voucher: ${error.message}`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    if (from >= totalItems || totalItems === 0) {
      return {
        vouchers: [],
        totalItems: totalItems
      };
    }

    try {
      const vouchers = await VoucherModel.findVouchersInRange(from, to);
      return { vouchers, totalItems };
    } catch (error) {
      throw new Error(`Lỗi lấy danh sách voucher: ${error.message}`);
    }
  },

  // Lấy danh sách voucher cho khách hàng (không phân trang, chỉ các trường cần thiết)
  getCustomerVouchers: async (accountId, orderValue = null) => {
    const activeVouchers = await VoucherModel.findAllActiveForCustomer();
    const now = new Date();
    
    const validVouchers = [];
    
    for (const voucher of activeVouchers) {
      // 1. Kiểm tra thời hạn sử dụng
      if (now < new Date(voucher.start_date) || now > new Date(voucher.end_date)) {
        continue;
      }
      
      // Kiểm tra số lượng voucher trên hệ thống đã hết chưa
      if (voucher.total_quantity > 0 && voucher.used_quantity >= voucher.total_quantity) {
        continue;
      }

      // 2. Kiểm tra giá trị đơn hàng tối thiểu (nếu có truyền giá trị đơn hàng)
      if (orderValue !== null && voucher.min_order_value && orderValue < voucher.min_order_value) {
        continue;
      }

      // 3. Kiểm tra số lần khách hàng đã sử dụng voucher (per_user_limit)
      if (accountId && voucher.per_user_limit > 0) {
        const usageCount = await VoucherModel.countUsagesByVoucherAndAccount(voucher.voucher_id, accountId);
        if (usageCount >= voucher.per_user_limit) {
          continue;
        }
      }
      
      // Chỉ trả về các trường cần thiết
      validVouchers.push({
        voucher_id: voucher.voucher_id,
        code: voucher.code,
        name: voucher.name,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        min_order_value: voucher.min_order_value,
        max_discount_amount: voucher.max_discount_amount
      });
    }

    // Tính toán số tiền sẽ giảm được cho mỗi voucher dựa trên orderValue hiện tại
    validVouchers.forEach(v => {
      let estimatedDiscount = 0;
      if (v.discount_type === 'percentage') {
        estimatedDiscount = ((orderValue || 0) * v.discount_value) / 100;
        if (v.max_discount_amount && estimatedDiscount > v.max_discount_amount) {
          estimatedDiscount = v.max_discount_amount;
        }
      } else if (v.discount_type === 'fixed_amount' || v.discount_type === 'free_shipping') {
        estimatedDiscount = v.discount_value;
      }
      // Lưu tạm vào object để sắp xếp (Frontend cũng có thể dùng biến này để hiển thị)
      v.estimated_discount = estimatedDiscount; 
    });

    // Sắp xếp danh sách giảm dần theo số tiền giảm được
    validVouchers.sort((a, b) => b.estimated_discount - a.estimated_discount);

    return validVouchers;
  },

  // Tìm chi tiết một voucher theo ID, ném lỗi nếu không tìm thấy
  getVoucherById: async (id) => {
    const voucher = await VoucherModel.findById(id);
    if (!voucher) throw new Error('Không tìm thấy voucher');
    return voucher;
  },
  
  // Tìm chi tiết một voucher theo mã code, ném lỗi nếu không tìm thấy
  getVoucherByCode: async (code) => {
    const voucher = await VoucherModel.findByCode(code);
    if (!voucher) throw new Error('Không tìm thấy voucher');
    return voucher;
  },

  // Kiểm tra sự tồn tại của voucher trước khi cho phép cập nhật thông tin
  updateVoucher: async (id, updateData) => {
    const voucher = await VoucherModel.findById(id);
    if (!voucher) throw new Error('Không tìm thấy voucher');
    return await VoucherModel.update(id, updateData);
  },


  // Voucher Usages
  // Xử lý áp dụng voucher: Kiểm tra hạn dùng, điều kiện giá, số lượng, lưu lịch sử và cập nhật số lượt dùng
  applyVoucher: async (voucherId, accountId, orderId, orderValue) => {
    const voucher = await VoucherModel.findById(voucherId);
    if (!voucher) throw new Error('Không tìm thấy voucher');
    if (voucher.status !== 'active') throw new Error('Voucher không còn hiệu lực');
    
    const now = new Date();
    if (now < new Date(voucher.start_date) || now > new Date(voucher.end_date)) {
      throw new Error('Voucher đã hết hạn hoặc chưa đến thời gian áp dụng');
    }

    if (voucher.min_order_value && orderValue < voucher.min_order_value) {
      throw new Error(`Giá trị đơn hàng phải từ ${voucher.min_order_value} trở lên để áp dụng voucher này`);
    }

    if (voucher.total_quantity > 0 && voucher.used_quantity >= voucher.total_quantity) {
      throw new Error('Voucher đã hết lượt sử dụng trên hệ thống');
    }

    const usageCount = await VoucherModel.countUsagesByVoucherAndAccount(voucherId, accountId);
    if (usageCount >= voucher.per_user_limit) {
      throw new Error(`Bạn đã đạt giới hạn số lần sử dụng cho voucher này`);
    }

    let discountAmount = 0;
    if (voucher.discount_type === 'percentage') {
      discountAmount = (orderValue * voucher.discount_value) / 100;
      if (voucher.max_discount_amount && discountAmount > voucher.max_discount_amount) {
        discountAmount = voucher.max_discount_amount;
      }
    } else if (voucher.discount_type === 'fixed_amount') {
      discountAmount = voucher.discount_value;
    } else if (voucher.discount_type === 'free_shipping') {
      // Logic for free shipping can be handled dynamically
      discountAmount = voucher.discount_value; // Assuming value represents shipping fee cap
    }

    // Record usage
    const usageData = {
      usage_voucher_id: crypto.randomUUID(),
      voucher_id: voucherId,
      account_id: accountId,
      order_id: orderId,
      discount_amount: discountAmount,
      used_at: new Date()
    };

    const usageRecord = await VoucherModel.recordUsage(usageData);

    // Update used_quantity
    await VoucherModel.update(voucherId, {
      used_quantity: voucher.used_quantity + 1
    });

    return { usageRecord, discountAmount };
  },

  // Lấy lịch sử sử dụng của một voucher cụ thể
  getVoucherUsagesByVoucherId: async (voucherId) => {
    return await VoucherModel.findUsagesByVoucherId(voucherId);
  },

  // Lấy danh sách các voucher đã được một người dùng sử dụng
  getVoucherUsagesByAccountId: async (accountId) => {
    return await VoucherModel.findUsagesByAccountId(accountId);
  }
};

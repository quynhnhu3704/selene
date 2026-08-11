// backend\order-service\src\models\voucher.model.js
import { supabase } from '../configs/supabase.js';

export const VoucherModel = {
  // Tạo một voucher mới vào cơ sở dữ liệu
  create: async (data) => {
    const { data: voucher, error } = await supabase
      .from('vouchers')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return voucher;
  },

  // Lấy tổng số lượng voucher để làm phân trang
  countVouchers: async () => {
    const { count, error } = await supabase
      .from('vouchers')
      .select('voucher_id', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  },

  // Lấy danh sách voucher có phân trang (từ vị trí from đến to)
  findVouchersInRange: async (from, to) => {
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return data;
  },

  // Lấy danh sách tất cả voucher đang hoạt động cho khách hàng (không phân trang, chỉ lấy trường cần thiết)
  findAllActiveForCustomer: async () => {
    const { data, error } = await supabase
      .from('vouchers')
      .select('voucher_id, code, name, discount_type, discount_value, min_order_value, max_discount_amount')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Tìm một voucher cụ thể dựa theo ID của nó
  findById: async (voucherId) => {
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('voucher_id', voucherId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Tìm một voucher cụ thể dựa theo mã code (VD: SALE100K)
  findByCode: async (code) => {
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', code)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Cập nhật thông tin của voucher theo ID
  update: async (voucherId, updateData) => {
    const { data, error } = await supabase
      .from('vouchers')
      .update(updateData)
      .eq('voucher_id', voucherId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },


  // Voucher Usages
  // Lưu lại lịch sử sử dụng voucher của khách hàng vào bảng voucher_usages
  recordUsage: async (usageData) => {
    const { data, error } = await supabase
      .from('voucher_usages')
      .insert([usageData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Lấy tất cả lịch sử sử dụng của một voucher cụ thể (Để xem voucher này ai đã dùng)
  findUsagesByVoucherId: async (voucherId) => {
    const { data, error } = await supabase
      .from('voucher_usages')
      .select('*')
      .eq('voucher_id', voucherId);
    if (error) throw error;
    return data;
  },

  // Lấy tất cả các voucher mà một user cụ thể đã sử dụng
  findUsagesByAccountId: async (accountId) => {
    const { data, error } = await supabase
      .from('voucher_usages')
      .select('*')
      .eq('account_id', accountId);
    if (error) throw error;
    return data;
  },

  // Đếm số lần một user đã sử dụng một mã voucher cụ thể (Dùng để check giới hạn per_user_limit)
  countUsagesByVoucherAndAccount: async (voucherId, accountId) => {
    const { count, error } = await supabase
      .from('voucher_usages')
      .select('*', { count: 'exact', head: true })
      .eq('voucher_id', voucherId)
      .eq('account_id', accountId);
    if (error) throw error;
    return count;
  }
};

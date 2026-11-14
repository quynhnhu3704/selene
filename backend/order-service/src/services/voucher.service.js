// backend\order-service\src\services\voucher.service.js
import { VoucherModel } from "../models/voucher.model.js";
import crypto from "crypto";

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

const voucherError = (message, status = 400) => Object.assign(new Error(message), { status });
const normalizeVoucher = (input, existing = {}) => {
  const merged = { ...existing, ...input };
  const data = {};
  for (const field of ["code", "name"]) {
    if (typeof merged[field] !== "string" || !merged[field].trim()) throw voucherError(`${field} không được để trống!`);
    data[field] = merged[field].trim();
  }
  data.code = data.code.toUpperCase().replace(/\s+/g, "");
  data.description = merged.description ?? null;
  if (data.description !== null && typeof data.description !== "string") throw voucherError("Mô tả không hợp lệ!");
  data.discount_type = merged.discount_type;
  if (!["percentage", "fixed_amount", "free_shipping"].includes(data.discount_type)) throw voucherError("Loại giảm giá không hợp lệ!");
  for (const field of ["discount_value", "min_order_value", "max_discount_amount", "total_quantity", "per_user_limit"]) {
    const raw = merged[field] ?? (field === "per_user_limit" ? 1 : 0);
    const value = Number(raw);
    if (!["string", "number"].includes(typeof raw) || raw === "" || !Number.isFinite(value) || value < 0) throw voucherError(`${field} không hợp lệ!`);
    if (["total_quantity", "per_user_limit"].includes(field) && !Number.isSafeInteger(value)) throw voucherError(`${field} phải là số nguyên!`);
    data[field] = value;
  }
  if (data.discount_type !== "free_shipping" && data.discount_value <= 0) throw voucherError("Giá trị giảm giá phải lớn hơn 0!");
  if (data.discount_type === "percentage" && data.discount_value > 100) throw voucherError("Giảm giá không được vượt quá 100%!");
  for (const field of ["start_date", "end_date"]) {
    if (!merged[field] || !Number.isFinite(new Date(merged[field]).getTime())) throw voucherError("Ngày áp dụng không hợp lệ!");
    data[field] = new Date(merged[field]).toISOString();
  }
  if (data.end_date <= data.start_date) throw voucherError("Ngày kết thúc phải sau ngày bắt đầu!");
  data.status = merged.status ?? "active";
  if (!["active", "inactive", "expired", "out_of_stock"].includes(data.status)) throw voucherError("Trạng thái voucher không hợp lệ!");
  return data;
};

export const VoucherService = {
  // Xử lý logic tạo mới một voucher (kiểm tra trùng mã code và sinh UUID tự động)
  createVoucher: async (voucherData) => {
    voucherData = normalizeVoucher(voucherData);
    const existing = await VoucherModel.findByCode(voucherData.code);
    if (existing) {
      throw voucherError(`Voucher code ${voucherData.code} đã tồn tại`, 409);
    }

    const voucher_id = "voucher-" + generateId();

    const dataToCreate = {
      voucher_id: voucher_id,
      ...voucherData,
      used_quantity: 0,
      created_at: new Date(),
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
        totalItems: totalItems,
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
      if (
        now < new Date(voucher.start_date) ||
        now > new Date(voucher.end_date)
      ) {
        continue;
      }

      // Kiểm tra số lượng voucher trên hệ thống đã hết chưa
      if (
        voucher.total_quantity > 0 &&
        voucher.used_quantity >= voucher.total_quantity
      ) {
        continue;
      }

      // 2. Kiểm tra giá trị đơn hàng tối thiểu (nếu có truyền giá trị đơn hàng)
      if (
        orderValue !== null &&
        voucher.min_order_value &&
        orderValue < voucher.min_order_value
      ) {
        continue;
      }

      // 3. Kiểm tra số lần khách hàng đã sử dụng voucher (per_user_limit)
      if (accountId && voucher.per_user_limit > 0) {
        const usageCount = await VoucherModel.countUsagesByVoucherAndAccount(
          voucher.voucher_id,
          accountId,
        );
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
        max_discount_amount: voucher.max_discount_amount,
      });
    }

    // Tính toán số tiền sẽ giảm được cho mỗi voucher dựa trên orderValue hiện tại
    validVouchers.forEach((v) => {
      let estimatedDiscount = 0;
      if (v.discount_type === "percentage") {
        estimatedDiscount = ((orderValue || 0) * v.discount_value) / 100;
        if (
          v.max_discount_amount &&
          estimatedDiscount > v.max_discount_amount
        ) {
          estimatedDiscount = v.max_discount_amount;
        }
      } else if (
        v.discount_type === "fixed_amount" ||
        v.discount_type === "free_shipping"
      ) {
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
    if (!voucher) throw voucherError("Không tìm thấy voucher", 404);
    return voucher;
  },

  // Tìm chi tiết một voucher theo mã code, ném lỗi nếu không tìm thấy
  getVoucherByCode: async (code) => {
    const voucher = await VoucherModel.findByCode(code);
    if (!voucher) throw voucherError("Không tìm thấy voucher", 404);
    return voucher;
  },

  // Kiểm tra sự tồn tại của voucher trước khi cho phép cập nhật thông tin
  updateVoucher: async (id, updateData) => {
    const voucher = await VoucherModel.findById(id);
    if (!voucher) throw voucherError("Không tìm thấy voucher", 404);
    const normalized = normalizeVoucher(updateData, voucher);
    const duplicate = await VoucherModel.findByCode(normalized.code);
    if (duplicate && duplicate.voucher_id !== voucher.voucher_id) throw voucherError("Mã voucher đã tồn tại!", 409);
    return await VoucherModel.update(id, normalized);
  },

  // Cập nhật trạng thái voucher (toggle active <-> inactive hoặc nhận status cụ thể)
  updateVoucherStatus: async (voucherId, status) => {
    if (!voucherId) {
      throw new Error("Mã ID voucher không được để trống!");
    }

    // 1. Kiểm tra voucher có tồn tại không (hỗ trợ cả voucher_id hoặc mã code)
    let voucher = await VoucherModel.findById(voucherId);
    if (!voucher) {
      voucher = await VoucherModel.findByCode(voucherId);
    }
    if (!voucher) {
      throw new Error("Không tìm thấy voucher yêu cầu!");
    }

    // 2. Xác định trạng thái mới dựa trên đầu vào (hoặc toggle nếu không truyền)
    let targetStatus;
    if (status !== undefined && status !== null && status !== "") {
      const validStatuses = ["active", "inactive", "out_of_stock", "expired"];
      if (!validStatuses.includes(status)) {
        throw new Error("Trạng thái voucher không hợp lệ!");
      }
      targetStatus = status;
    } else {
      // Toggle trạng thái nếu không truyền status cụ thể: active -> inactive và ngược lại
      targetStatus = voucher.status === "active" ? "inactive" : "active";
    }

    // 3. Cập nhật trạng thái của voucher theo voucher_id chuẩn
    const updatedVoucher = await VoucherModel.updateStatus(
      voucher.voucher_id,
      targetStatus,
    );

    return updatedVoucher;
  },

  // Voucher Usages
  // Xử lý áp dụng voucher: Kiểm tra hạn dùng, điều kiện giá, số lượng, lưu lịch sử và cập nhật số lượt dùng
  applyVoucher: async (voucherId, accountId, orderId, orderValue) => {
    const voucher = await VoucherModel.findById(voucherId);
    if (!voucher) throw voucherError("Không tìm thấy voucher", 404);
    if (voucher.status !== "active")
      throw new Error("Voucher không còn hiệu lực");

    const now = new Date();
    if (
      now < new Date(voucher.start_date) ||
      now > new Date(voucher.end_date)
    ) {
      throw new Error("Voucher đã hết hạn hoặc chưa đến thời gian áp dụng");
    }

    if (voucher.min_order_value && orderValue < voucher.min_order_value) {
      throw new Error(
        `Giá trị đơn hàng phải từ ${voucher.min_order_value} trở lên để áp dụng voucher này`,
      );
    }

    if (
      voucher.total_quantity > 0 &&
      voucher.used_quantity >= voucher.total_quantity
    ) {
      throw new Error("Voucher đã hết lượt sử dụng trên hệ thống");
    }

    const usageCount = await VoucherModel.countUsagesByVoucherAndAccount(
      voucherId,
      accountId,
    );
    if (usageCount >= voucher.per_user_limit) {
      throw new Error(`Bạn đã đạt giới hạn số lần sử dụng cho voucher này`);
    }

    let discountAmount = 0;
    if (voucher.discount_type === "percentage") {
      discountAmount = (orderValue * voucher.discount_value) / 100;
      if (
        voucher.max_discount_amount &&
        discountAmount > voucher.max_discount_amount
      ) {
        discountAmount = voucher.max_discount_amount;
      }
    } else if (voucher.discount_type === "fixed_amount") {
      discountAmount = voucher.discount_value;
    } else if (voucher.discount_type === "free_shipping") {
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
      used_at: new Date(),
    };

    const usageRecord = await VoucherModel.recordUsage(usageData);

    // Update used_quantity and check out_of_stock
    const newUsedQty = voucher.used_quantity + 1;
    const updateData = { used_quantity: newUsedQty };
    if (voucher.total_quantity > 0 && newUsedQty >= voucher.total_quantity) {
      updateData.status = "out_of_stock";
    }
    await VoucherModel.update(voucherId, updateData);

    return { usageRecord, discountAmount };
  },

  // Lấy lịch sử sử dụng của một voucher cụ thể
  getVoucherUsagesByVoucherId: async (voucherId) => {
    return await VoucherModel.findUsagesByVoucherId(voucherId);
  },

  // Lấy danh sách các voucher đã được một người dùng sử dụng
  getVoucherUsagesByAccountId: async (accountId) => {
    return await VoucherModel.findUsagesByAccountId(accountId);
  },
};

// Tự động kiểm tra và chuyển các mã voucher đã hết hạn (end_date <= now) sang 'expired'
export const checkAndUpdateExpiredVouchers = async () => {
  try {
    const now = new Date();

    // 1. Lấy tất cả voucher đang ở trạng thái active
    const activeVouchers = await VoucherModel.findAllActiveForCustomer();

    if (!activeVouchers || activeVouchers.length === 0) return;

    // 2. Lọc các voucher có end_date <= thời gian hiện tại bằng JS Date
    const expiredVouchers = activeVouchers.filter((voucher) => {
      if (!voucher.end_date) return false;
      const endDateObj = new Date(voucher.end_date);
      return !isNaN(endDateObj.getTime()) && endDateObj <= now;
    });

    if (expiredVouchers.length === 0) return;

    console.log(
      `[Voucher Scheduler] Phát hiện ${expiredVouchers.length} mã voucher đã hết hạn.`,
    );

    for (const voucher of expiredVouchers) {
      await VoucherModel.update(voucher.voucher_id, {
        status: "expired",
      });

      console.log(
        `[+] Voucher '${voucher.code}' (${voucher.voucher_id}) đã hết hạn (kết thúc: ${voucher.end_date}). Đã tự động cập nhật status thành 'expired'.`,
      );
    }
  } catch (err) {
    console.error(
      "[Voucher Scheduler] Lỗi tại checkAndUpdateExpiredVouchers:",
      err.message || err,
    );
  }
};

// Khởi chạy trình lên lịch (Scheduler) kiểm tra voucher hết hạn định kỳ
export const startVoucherScheduler = (intervalMs = 60000) => {
  console.log(
    `[Voucher Scheduler] Đã khởi chạy Voucher Scheduler (quét định kỳ mỗi ${intervalMs / 1000}s)...`,
  );

  // Thực hiện quét ngay khi khởi động
  checkAndUpdateExpiredVouchers();

  // Lập lịch quét định kỳ
  setInterval(() => {
    checkAndUpdateExpiredVouchers();
  }, intervalMs);
};

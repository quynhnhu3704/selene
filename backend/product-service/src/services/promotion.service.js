// backend\product-service\src\services\promotion.service.js
import { PromotionModel } from "../models/promotion.model.js";

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

// Tạo mới 1 chương trình khuyến mãi
export const createPromotion = async (promotionInput) => {
  try {
    const {
      name,
      description,
      discount_type,
      discount_value,
      quantity_limit,
      start_date,
      end_date,
      status,
      product_ids,
      productIds,
    } = promotionInput;

    // 1. Kiểm tra các trường bắt buộc
    if (!name || name.trim() === "") {
      throw new Error("Tên chương trình khuyến mãi là bắt buộc và không được để trống!");
    }

    if (!discount_type) {
      throw new Error("Loại giảm giá (discount_type) là bắt buộc!");
    }

    const validDiscountTypes = ["percentage", "fixed_amount"];
    if (!validDiscountTypes.includes(discount_type)) {
      throw new Error("Loại giảm giá không hợp lệ! (Chấp nhận 'percentage' hoặc 'fixed_amount')");
    }

    if (discount_value === undefined || discount_value === null || isNaN(Number(discount_value))) {
      throw new Error("Giá trị giảm giá (discount_value) phải là một số hợp lệ!");
    }

    const numericDiscountValue = Number(discount_value);
    if (numericDiscountValue <= 0) {
      throw new Error("Giá trị giảm giá phải lớn hơn 0!");
    }

    if (discount_type === "percentage" && numericDiscountValue > 100) {
      throw new Error("Giảm giá theo phần trăm không được vượt quá 100%!");
    }

    if (!start_date) {
      throw new Error("Thời gian bắt đầu (start_date) là bắt buộc!");
    }

    if (!end_date) {
      throw new Error("Thời gian kết thúc (end_date) là bắt buộc!");
    }

    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (isNaN(startDateObj.getTime())) {
      throw new Error("Thời gian bắt đầu (start_date) không đúng định dạng ngày tháng!");
    }

    if (isNaN(endDateObj.getTime())) {
      throw new Error("Thời gian kết thúc (end_date) không đúng định dạng ngày tháng!");
    }

    if (endDateObj <= startDateObj) {
      throw new Error("Thời gian kết thúc (end_date) phải lớn hơn thời gian bắt đầu (start_date)!");
    }

    // 2. Kiểm tra trùng tên khuyến mãi
    const isNameExists = await PromotionModel.checkNameExists(name.trim());
    if (isNameExists) {
      throw new Error(`Chương trình khuyến mãi với tên '${name.trim()}' đã tồn tại!`);
    }

    // 3. Xử lý danh sách sản phẩm áp dụng (product_ids)
    const rawProductIds = product_ids || productIds || [];
    const targetProductIds = Array.isArray(rawProductIds)
      ? [...new Set(rawProductIds.map((id) => String(id).trim()).filter(Boolean))]
      : [];

    let existingProducts = [];
    if (targetProductIds.length > 0) {
      existingProducts = await PromotionModel.checkProductsExist(targetProductIds);
      const foundIds = existingProducts.map((p) => p.product_id);
      const missingIds = targetProductIds.filter((id) => !foundIds.includes(id));

      if (missingIds.length > 0) {
        throw new Error(`Các sản phẩm sau không tồn tại trong hệ thống: ${missingIds.join(", ")}`);
      }
    }

    // 4. Chuẩn bị dữ liệu lưu DB
    const promotion_id = "promo-" + generateId();
    const currentTime = new Date().toISOString();

    const limitQty =
      quantity_limit !== undefined && quantity_limit !== null
        ? Math.max(0, parseInt(quantity_limit, 10) || 0)
        : 0;

    const initialStatus = status || "active";

    // 5. Thêm bản ghi khuyến mãi
    const newPromotion = await PromotionModel.create({
      promotion_id,
      name: name.trim(),
      description: description || null,
      discount_type,
      discount_value: numericDiscountValue,
      quantity_limit: limitQty,
      used_quantity: 0,
      start_date: startDateObj.toISOString(),
      end_date: endDateObj.toISOString(),
      status: initialStatus,
      created_at: currentTime,
      updated_at: currentTime,
    });

    // 6. Thêm các bản ghi sản phẩm áp dụng (promotion_items)
    let createdItems = [];
    if (targetProductIds.length > 0) {
      const itemsToInsert = targetProductIds.map((pid) => ({
        promotion_item_id: "pi-" + generateId(),
        promotion_id,
        product_id: pid,
        created_at: currentTime,
      }));

      createdItems = await PromotionModel.createPromotionItems(itemsToInsert);

      // Kết hợp thông tin chi tiết sản phẩm cho kết quả trả về
      createdItems = createdItems.map((item) => {
        const prodInfo = existingProducts.find((p) => p.product_id === item.product_id);
        return {
          ...item,
          product: prodInfo || null,
        };
      });

      // Tự động tính toán và cập nhật discount_price trong bảng products
      await PromotionModel.recalculateProductsDiscountPrice(targetProductIds);
    }

    return {
      ...newPromotion,
      promotion_items: createdItems,
    };
  } catch (error) {
    console.error("Lỗi tại createPromotion Service:", error.message);
    throw error;
  }
};

// Lấy danh sách tất cả chương trình khuyến mãi (Kèm theo thông tin chi tiết sản phẩm áp dụng)
export const getAllPromotions = async (options = {}) => {
  try {
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const filters = {
      status: options.status,
      q: options.q,
    };

    const { data, count } = await PromotionModel.getPromotionsWithPagination(from, to, filters);
    const totalPages = Math.ceil((count || 0) / limit);

    return {
      promotions: data || [],
      pagination: {
        currentPage: page,
        limit,
        totalItems: count || 0,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Lỗi tại getAllPromotions Service:", error.message || error);
    throw error;
  }
};

// Cập nhật trạng thái khuyến mãi (Tự động đảo active <-> inactive nếu không truyền body)
export const updatePromotionStatus = async (promotion_id, statusInput) => {
  try {
    const existingPromo = await PromotionModel.getPromotionById(promotion_id);
    if (!existingPromo) {
      throw new Error("Không tìm thấy chương trình khuyến mãi yêu cầu!");
    }

    let targetStatus;
    if (statusInput) {
      const validStatuses = ["active", "inactive", "out_of_stock", "expired"];
      if (!validStatuses.includes(statusInput)) {
        throw new Error("Trạng thái khuyến mãi không hợp lệ!");
      }
      targetStatus = statusInput;
    } else {
      // Nếu không truyền status -> Tự động toggle giữa active và inactive
      targetStatus = existingPromo.status === "active" ? "inactive" : "active";
    }

    const updated_at = new Date().toISOString();
    const updated = await PromotionModel.updateStatus(promotion_id, targetStatus, updated_at);

    // Tự động tính toán lại discount_price trong bảng products cho các sản phẩm liên quan
    const affectedProductIds = (existingPromo?.promotion_items || []).map((item) => item.product_id);
    if (affectedProductIds.length > 0) {
      await PromotionModel.recalculateProductsDiscountPrice(affectedProductIds);
    }

    return updated;
  } catch (error) {
    console.error("Lỗi tại updatePromotionStatus Service:", error.message);
    throw error;
  }
};

// Cập nhật thông tin chi tiết chương trình khuyến mãi
export const updatePromotion = async (promotion_id, updateInput) => {
  try {
    // 1. Kiểm tra chương trình khuyến mãi có tồn tại không
    const existingPromotion = await PromotionModel.getPromotionById(promotion_id);
    if (!existingPromotion) {
      throw new Error("Không tìm thấy chương trình khuyến mãi yêu cầu!");
    }

    const {
      name,
      description,
      discount_type,
      discount_value,
      quantity_limit,
      start_date,
      end_date,
      status,
      product_ids,
      productIds,
    } = updateInput;

    const updateData = {};

    // 2. Kiểm tra tên mới
    if (name !== undefined) {
      if (name.trim() === "") {
        throw new Error("Tên chương trình khuyến mãi không được để trống!");
      }

      const isNameDup = await PromotionModel.checkNameExistsForUpdate(name.trim(), promotion_id);
      if (isNameDup) {
        throw new Error(`Tên chương trình khuyến mãi '${name.trim()}' đã được sử dụng!`);
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    // 3. Loại và giá trị giảm giá
    const targetType = discount_type || existingPromotion.discount_type;
    const targetValue =
      discount_value !== undefined ? Number(discount_value) : Number(existingPromotion.discount_value);

    if (discount_type !== undefined) {
      const validDiscountTypes = ["percentage", "fixed_amount"];
      if (!validDiscountTypes.includes(discount_type)) {
        throw new Error("Loại giảm giá không hợp lệ! (Chấp nhận 'percentage' hoặc 'fixed_amount')");
      }
      updateData.discount_type = discount_type;
    }

    if (discount_value !== undefined) {
      if (isNaN(targetValue) || targetValue <= 0) {
        throw new Error("Giá trị giảm giá phải là một số lớn hơn 0!");
      }
      updateData.discount_value = targetValue;
    }

    if (targetType === "percentage" && targetValue > 100) {
      throw new Error("Giảm giá theo phần trăm không được vượt quá 100%!");
    }

    // 4. Thời gian áp dụng
    const effectiveStartDateStr = start_date || existingPromotion.start_date;
    const effectiveEndDateStr = end_date || existingPromotion.end_date;

    const startDateObj = new Date(effectiveStartDateStr);
    const endDateObj = new Date(effectiveEndDateStr);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new Error("Thời gian khuyến mãi không đúng định dạng ngày tháng!");
    }

    if (endDateObj <= startDateObj) {
      throw new Error("Thời gian kết thúc (end_date) phải lớn hơn thời gian bắt đầu (start_date)!");
    }

    if (start_date !== undefined) updateData.start_date = startDateObj.toISOString();
    if (end_date !== undefined) updateData.end_date = endDateObj.toISOString();

    // 5. Giới hạn số lượng
    if (quantity_limit !== undefined) {
      updateData.quantity_limit = Math.max(0, parseInt(quantity_limit, 10) || 0);
    }

    // 6. Trạng thái
    if (status !== undefined) {
      const validStatuses = ["active", "inactive", "out_of_stock", "expired"];
      if (!validStatuses.includes(status)) {
        throw new Error("Trạng thái khuyến mãi không hợp lệ!");
      }
      updateData.status = status;
    }

    const currentTime = new Date().toISOString();
    updateData.updated_at = currentTime;

    // Cập nhật thông tin chính trong bảng promotions
    if (Object.keys(updateData).length > 1) {
      await PromotionModel.update(promotion_id, updateData);
    }

    // 7. Cập nhật danh sách sản phẩm áp dụng (promotion_items)
    const rawProductIds = product_ids || productIds;
    if (rawProductIds !== undefined && Array.isArray(rawProductIds)) {
      const targetProductIds = [
        ...new Set(rawProductIds.map((id) => String(id).trim()).filter(Boolean)),
      ];

      if (targetProductIds.length > 0) {
        const existingProducts = await PromotionModel.checkProductsExist(targetProductIds);
        const foundIds = existingProducts.map((p) => p.product_id);
        const missingIds = targetProductIds.filter((id) => !foundIds.includes(id));

        if (missingIds.length > 0) {
          throw new Error(`Các sản phẩm sau không tồn tại trong hệ thống: ${missingIds.join(", ")}`);
        }

        // Xóa sản phẩm cũ và thêm lại danh sách mới
        await PromotionModel.deletePromotionItems(promotion_id);

        const itemsToInsert = targetProductIds.map((pid) => ({
          promotion_item_id: "pi-" + generateId(),
          promotion_id,
          product_id: pid,
          created_at: currentTime,
        }));

        await PromotionModel.createPromotionItems(itemsToInsert);
      } else {
        await PromotionModel.deletePromotionItems(promotion_id);
      }
    }

    // Trả về đối tượng khuyến mãi sau khi đã cập nhật hoàn chỉnh
    const updatedPromotion = await PromotionModel.getPromotionById(promotion_id);

    // Tự động tính toán lại discount_price trong bảng products cho tất cả sản phẩm thuộc khuyến mãi này
    const affectedProductIds = (updatedPromotion?.promotion_items || []).map((item) => item.product_id);
    if (affectedProductIds.length > 0) {
      await PromotionModel.recalculateProductsDiscountPrice(affectedProductIds);
    }

    return updatedPromotion;
  } catch (error) {
    console.error("Lỗi tại updatePromotion Service:", error.message);
    throw error;
  }
};

// Thêm 1 hoặc nhiều sản phẩm vào chương trình khuyến mãi đã có
export const addProductsToPromotion = async (promotion_id, inputData = {}) => {
  try {
    // 1. Kiểm tra chương trình khuyến mãi có tồn tại không
    const existingPromotion = await PromotionModel.getPromotionById(promotion_id);
    if (!existingPromotion) {
      throw new Error("Không tìm thấy chương trình khuyến mãi yêu cầu!");
    }

    const rawProductIds =
      inputData.product_ids || inputData.productIds || inputData.product_id || inputData.productId;

    if (!rawProductIds) {
      throw new Error("Danh sách sản phẩm thêm vào khuyến mãi không được để trống!");
    }

    // Chuẩn hóa thành mảng các ID sản phẩm duy nhất
    const productIdsArray = Array.isArray(rawProductIds) ? rawProductIds : [rawProductIds];
    const targetProductIds = [
      ...new Set(productIdsArray.map((id) => String(id).trim()).filter(Boolean)),
    ];

    if (targetProductIds.length === 0) {
      throw new Error("Danh sách sản phẩm thêm vào khuyến mãi không được để trống!");
    }

    // 2. Kiểm tra các sản phẩm có tồn tại trong hệ thống (bảng products) không
    const existingProducts = await PromotionModel.checkProductsExist(targetProductIds);
    const foundIds = existingProducts.map((p) => p.product_id);
    const missingIds = targetProductIds.filter((id) => !foundIds.includes(id));

    if (missingIds.length > 0) {
      throw new Error(`Các sản phẩm sau không tồn tại trong hệ thống: ${missingIds.join(", ")}`);
    }

    // 3. Lọc ra các sản phẩm CHƯA có trong chương trình khuyến mãi này
    const currentItemProductIds = (existingPromotion.promotion_items || []).map(
      (item) => item.product_id
    );

    const newIdsToInsert = targetProductIds.filter(
      (pid) => !currentItemProductIds.includes(pid)
    );

    if (newIdsToInsert.length === 0) {
      throw new Error("Tất cả sản phẩm gửi lên đều đã tồn tại trong chương trình khuyến mãi này!");
    }

    // 4. Thêm các bản ghi sản phẩm mới vào bảng promotion_items
    const currentTime = new Date().toISOString();
    const itemsToInsert = newIdsToInsert.map((pid) => ({
      promotion_item_id: "pi-" + generateId(),
      promotion_id,
      product_id: pid,
      created_at: currentTime,
    }));

    await PromotionModel.createPromotionItems(itemsToInsert);

    // Cập nhật lại thời gian updated_at của khuyến mãi
    await PromotionModel.update(promotion_id, { updated_at: currentTime });

    // Tự động tính toán lại discount_price trong bảng products cho các sản phẩm vừa thêm
    await PromotionModel.recalculateProductsDiscountPrice(newIdsToInsert);

    // 5. Trả về thông tin khuyến mãi sau khi đã cập nhật thêm sản phẩm
    const updatedPromotion = await PromotionModel.getPromotionById(promotion_id);
    return updatedPromotion;
  } catch (error) {
    console.error("Lỗi tại addProductsToPromotion Service:", error.message);
    throw error;
  }
};

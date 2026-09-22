// backend\product-service\src\services\promotion.service.js
import { PromotionModel } from "../models/promotion.model.js";
import { supabase } from "../configs/supabase.js";

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

// Helper kiểm tra xung đột sản phẩm đã được áp dụng trong chương trình khuyến mãi active khác
const verifyNoActivePromotionConflicts = async (productIds, excludePromotionId = null) => {
  if (!productIds || productIds.length === 0) return;
  const conflicts = await PromotionModel.checkProductActivePromotionConflicts(
    productIds,
    excludePromotionId
  );
  if (conflicts && conflicts.length > 0) {
    const details = conflicts
      .map(
        (c) =>
          `Sản phẩm '${c.product_name}' (Mã SP: ${c.product_id}) đang được áp dụng trong chương trình khuyến mãi '${c.promotion_name}' (Mã KM: ${c.promotion_id})`
      )
      .join("; ");
    throw new Error(
      `Không thể thực hiện! ${details}. Mỗi sản phẩm chỉ được áp dụng 1 chương trình khuyến mãi ở trạng thái active!`
    );
  }
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

    // Kiểm tra xung đột sản phẩm nếu khuyến mãi ở trạng thái active
    if (initialStatus === "active" && targetProductIds.length > 0) {
      await verifyNoActivePromotionConflicts(targetProductIds);
    }

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
        updated_at: currentTime,
        status: initialStatus || "active",
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

    // Nếu chuyển sang active -> Kiểm tra xung đột cho các sản phẩm thuộc chương trình này
    if (targetStatus === "active") {
      const activeItemProductIds = (existingPromo?.promotion_items || [])
        .filter((item) => !item.status || item.status === "active")
        .map((item) => item.product_id);

      if (activeItemProductIds.length > 0) {
        await verifyNoActivePromotionConflicts(activeItemProductIds, promotion_id);
      }
    }

    const updated_at = new Date().toISOString();
    const updated = await PromotionModel.updateStatus(promotion_id, targetStatus, updated_at);

    // Nếu cập nhật promotion thành inactive, out_of_stock hoặc expired -> Cập nhật tất cả promotion_items thành inactive
    // Nếu thành active -> status của promotion_items giữ nguyên không thay đổi
    if (targetStatus === "inactive" || targetStatus === "out_of_stock" || targetStatus === "expired") {
      await PromotionModel.updatePromotionItemsStatus(promotion_id, "inactive", updated_at);
    }

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

    // Kiểm tra xung đột khi khuyến mãi ở (hoặc được cập nhật thành) trạng thái active
    const targetStatus = status !== undefined ? status : existingPromotion.status;
    const rawProductIds = product_ids || productIds;
    let targetProductIds = [];

    if (rawProductIds !== undefined && Array.isArray(rawProductIds)) {
      targetProductIds = [
        ...new Set(rawProductIds.map((id) => String(id).trim()).filter(Boolean)),
      ];
    } else {
      targetProductIds = (existingPromotion?.promotion_items || [])
        .filter((item) => !item.status || item.status === "active")
        .map((item) => item.product_id);
    }

    if (targetStatus === "active" && targetProductIds.length > 0) {
      await verifyNoActivePromotionConflicts(targetProductIds, promotion_id);
    }

    const currentTime = new Date().toISOString();
    updateData.updated_at = currentTime;

    // Cập nhật thông tin chính trong bảng promotions
    if (Object.keys(updateData).length > 1) {
      await PromotionModel.update(promotion_id, updateData);
    }

    // 7. Cập nhật danh sách sản phẩm áp dụng (promotion_items)
    if (rawProductIds !== undefined && Array.isArray(rawProductIds)) {
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
          updated_at: currentTime,
          status: status || existingPromotion.status || "active",
        }));

        await PromotionModel.createPromotionItems(itemsToInsert);
      } else {
        await PromotionModel.deletePromotionItems(promotion_id);
      }
    } else if (status === "inactive" || status === "out_of_stock" || status === "expired") {
      await PromotionModel.updatePromotionItemsStatus(promotion_id, "inactive", currentTime);
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

    // Nếu khuyến mãi đang ở trạng thái active -> Kiểm tra các sản phẩm mới có thuộc khuyến mãi active khác không
    if (existingPromotion.status === "active") {
      await verifyNoActivePromotionConflicts(newIdsToInsert, promotion_id);
    }

    // 4. Thêm các bản ghi sản phẩm mới vào bảng promotion_items
    const currentTime = new Date().toISOString();
    const itemsToInsert = newIdsToInsert.map((pid) => ({
      promotion_item_id: "pi-" + generateId(),
      promotion_id,
      product_id: pid,
      created_at: currentTime,
      updated_at: currentTime,
      status: existingPromotion.status || "active",
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

// Cập nhật trạng thái của 1 sản phẩm khuyến mãi (promotion_item)
export const updatePromotionItemStatus = async (promotion_item_id, statusInput) => {
  try {
    const existingItem = await PromotionModel.getPromotionItemById(promotion_item_id);
    if (!existingItem) {
      throw new Error("Không tìm thấy sản phẩm khuyến mãi yêu cầu!");
    }

    const parentPromo = await PromotionModel.getPromotionById(existingItem.promotion_id);
    if (!parentPromo) {
      throw new Error("Không tìm thấy chương trình khuyến mãi tương ứng!");
    }

    let targetStatus;
    if (statusInput) {
      const validStatuses = ["active", "inactive", "out_of_stock", "expired"];
      if (!validStatuses.includes(statusInput)) {
        throw new Error("Trạng thái sản phẩm khuyến mãi không hợp lệ!");
      }
      targetStatus = statusInput;
    } else {
      // Toggle giữa active và inactive nếu không truyền statusInput
      targetStatus = existingItem.status === "active" ? "inactive" : "active";
    }

    // Kiểm tra quy tắc:
    // Nếu status của chương trình khuyến mãi đang là active -> có thể chuyển qua lại giữa active/inactive
    // Ngược lại (promotion không ở trạng thái active) -> promotion_item chỉ có thể ở trạng thái inactive (hoặc non-active)
    if (targetStatus === "active") {
      if (parentPromo.status !== "active") {
        throw new Error(
          "Không thể kích hoạt sản phẩm khuyến mãi khi chương trình khuyến mãi không ở trạng thái 'active'!"
        );
      }
      if (existingItem.product_id) {
        await verifyNoActivePromotionConflicts(
          [existingItem.product_id],
          existingItem.promotion_id
        );
      }
    }

    const currentTime = new Date().toISOString();
    const updatedItem = await PromotionModel.updateSinglePromotionItemStatus(
      promotion_item_id,
      targetStatus,
      currentTime
    );

    // Tự động tính toán lại discount_price của sản phẩm liên quan
    if (existingItem.product_id) {
      await PromotionModel.recalculateProductsDiscountPrice([existingItem.product_id]);
    }

    return updatedItem;
  } catch (error) {
    console.error("Lỗi tại updatePromotionItemStatus Service:", error.message);
    throw error;
  }
};

// Cập nhật số lượng đã dùng (used_quantity) của chương trình khuyến mãi khi đơn hàng được tạo thành công
export const updatePromotionUsedQuantityOnOrder = async (orderItems) => {
  try {
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) return;

    // 1. Tổng hợp số lượng mua theo product_id cho các sản phẩm có quantity > 0
    const productQtyMap = {};
    for (const item of orderItems) {
      const qty = Number(item.quantity);
      if (!qty || qty <= 0) continue;

      let productId = item.product_id;

      // Nếu không có product_id trong item payload, truy vấn từ product_variants theo variant_id
      if (!productId && item.variant_id) {
        const { data: variant } = await supabase
          .from("product_variants")
          .select("product_id")
          .eq("variant_id", item.variant_id)
          .single();
        if (variant) productId = variant.product_id;
      }

      if (productId) {
        productQtyMap[productId] = (productQtyMap[productId] || 0) + qty;
      }
    }

    const productIds = Object.keys(productQtyMap);
    if (productIds.length === 0) return;

    // 2. Tìm danh sách promotion_items đang ở trạng thái active của các sản phẩm này
    const { data: activeItems, error: itemsErr } = await supabase
      .from("promotion_items")
      .select("promotion_id, product_id")
      .in("product_id", productIds)
      .eq("status", "active");

    if (itemsErr || !activeItems || activeItems.length === 0) return;

    // 3. Tìm các chương trình khuyến mãi cha tương ứng đang ở trạng thái active
    const promoIds = [...new Set(activeItems.map((item) => item.promotion_id))];
    const { data: activePromos, error: promoErr } = await supabase
      .from("promotions")
      .select("promotion_id, used_quantity, quantity_limit, status")
      .in("promotion_id", promoIds)
      .eq("status", "active");

    if (promoErr || !activePromos || activePromos.length === 0) return;

    const promoMap = {};
    activePromos.forEach((p) => {
      promoMap[p.promotion_id] = p;
    });

    // 4. Tính toán tổng số lượng sản phẩm mua thuộc về từng chương trình khuyến mãi
    const promoQtyMap = {};
    for (const item of activeItems) {
      const pId = item.promotion_id;
      if (promoMap[pId]) {
        const qtyBought = productQtyMap[item.product_id] || 0;
        promoQtyMap[pId] = (promoQtyMap[pId] || 0) + qtyBought;
      }
    }

    const currentTime = new Date().toISOString();

    // 5. Cập nhật used_quantity và status cho từng chương trình khuyến mãi
    for (const promoId of Object.keys(promoQtyMap)) {
      const promo = promoMap[promoId];
      const addedQty = promoQtyMap[promoId];
      const currentUsed = Number(promo.used_quantity) || 0;
      const limit = Number(promo.quantity_limit) || 0;

      const newUsedQuantity = currentUsed + addedQty;
      const isLimitReached = limit > 0 && newUsedQuantity >= limit;

      if (isLimitReached) {
        // Cập nhật khuyến mãi thành out_of_stock và gán used_quantity mới
        await PromotionModel.update(promoId, {
          used_quantity: newUsedQuantity,
          status: "out_of_stock",
          updated_at: currentTime,
        });

        // Cập nhật tất cả các promotion_items thuộc khuyến mãi này thành inactive
        await PromotionModel.updatePromotionItemsStatus(promoId, "inactive", currentTime);

        // Lấy danh sách sản phẩm thuộc khuyến mãi để tính toán lại discount_price trong bảng products
        const fullPromo = await PromotionModel.getPromotionById(promoId);
        const affectedProductIds = (fullPromo?.promotion_items || []).map((item) => item.product_id);
        if (affectedProductIds.length > 0) {
          await PromotionModel.recalculateProductsDiscountPrice(affectedProductIds);
        }

        console.log(
          `[+] Chương trình khuyến mãi ${promoId} đã sử dụng hết suất (${newUsedQuantity}/${limit}). Đã chuyển status thành 'out_of_stock', promotion_items thành 'inactive' và tính lại discount_price.`
        );
      } else {
        // Cập nhật used_quantity mới
        await PromotionModel.update(promoId, {
          used_quantity: newUsedQuantity,
          updated_at: currentTime,
        });

        console.log(
          `[+] Chương trình khuyến mãi ${promoId} đã cập nhật used_quantity: ${currentUsed} -> ${newUsedQuantity} / ${limit || "không giới hạn"}.`
        );
      }
    }
  } catch (error) {
    console.error("Lỗi tại updatePromotionUsedQuantityOnOrder:", error.message || error);
  }
};

// Tự động kiểm tra và chuyển các chương trình khuyến mãi đã hết hạn (end_date <= now) sang 'expired'
export const checkAndUpdateExpiredPromotions = async () => {
  try {
    const now = new Date();

    // 1. Lấy tất cả chương trình khuyến mãi đang ở trạng thái active
    const { data: activePromos, error } = await supabase
      .from("promotions")
      .select("*")
      .eq("status", "active");

    if (error) {
      console.error("[Scheduler] Lỗi khi kiểm tra khuyến mãi hết hạn:", error.message);
      return;
    }

    if (!activePromos || activePromos.length === 0) return;

    // 2. Lọc các khuyến mãi có end_date <= thời gian hiện tại bằng JS Date (chính xác tuyệt đối)
    const expiredPromos = activePromos.filter((promo) => {
      if (!promo.end_date) return false;
      const endDateObj = new Date(promo.end_date);
      return !isNaN(endDateObj.getTime()) && endDateObj <= now;
    });

    if (expiredPromos.length === 0) return;

    console.log(`[Scheduler] Phát hiện ${expiredPromos.length} chương trình khuyến mãi đã hết hạn.`);

    for (const promo of expiredPromos) {
      const promoId = promo.promotion_id;
      const currentTime = new Date().toISOString();

      // Cập nhật status của khuyến mãi thành expired
      await PromotionModel.updateStatus(promoId, "expired", currentTime);

      // Cập nhật tất cả các promotion_items thuộc khuyến mãi này thành inactive
      await PromotionModel.updatePromotionItemsStatus(promoId, "inactive", currentTime);

      // Lấy danh sách sản phẩm liên quan để tính toán lại discount_price
      const fullPromo = await PromotionModel.getPromotionById(promoId);
      const affectedProductIds = (fullPromo?.promotion_items || []).map((item) => item.product_id);

      if (affectedProductIds.length > 0) {
        await PromotionModel.recalculateProductsDiscountPrice(affectedProductIds);
      }

      console.log(
        `[+] Khuyến mãi '${promo.name}' (${promoId}) đã hết hạn (kết thúc: ${promo.end_date}). Đã tự động cập nhật status thành 'expired', items thành 'inactive' và tính lại giá sản phẩm.`
      );
    }
  } catch (err) {
    console.error("Lỗi tại checkAndUpdateExpiredPromotions:", err.message || err);
  }
};

// Khởi chạy trình lên lịch (Scheduler) kiểm tra khuyến mãi hết hạn định kỳ
export const startPromotionScheduler = (intervalMs = 60000) => {
  console.log(`[Scheduler] Đã khởi chạy Promotion Scheduler (quét định kỳ mỗi ${intervalMs / 1000}s)...`);

  // Thực hiện quét ngay khi khởi động
  checkAndUpdateExpiredPromotions();

  // Lập lịch quét định kỳ
  setInterval(() => {
    checkAndUpdateExpiredPromotions();
  }, intervalMs);
};

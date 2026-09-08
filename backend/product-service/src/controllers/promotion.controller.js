// backend\product-service\src\controllers\promotion.controller.js
import * as promotionService from "../services/promotion.service.js";

// Controller tạo mới chương trình khuyến mãi
export const handleCreatePromotion = async (req, res) => {
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
    } = req.body;

    const result = await promotionService.createPromotion({
      name,
      description,
      discount_type,
      discount_value,
      quantity_limit,
      start_date,
      end_date,
      status,
      product_ids: product_ids || productIds,
    });

    return res.status(201).json({
      status: 201,
      message: "Tạo mới chương trình khuyến mãi thành công!",
      data: result,
    });
  } catch (error) {
    console.error("Lỗi tại handleCreatePromotion Controller:", error.message);

    const isClientError =
      error.message.includes("bắt buộc") ||
      error.message.includes("không hợp lệ") ||
      error.message.includes("đã tồn tại") ||
      error.message.includes("không đúng định dạng") ||
      error.message.includes("phải lớn hơn") ||
      error.message.includes("không được vượt quá") ||
      error.message.includes("không tồn tại");

    return res.status(isClientError ? 400 : 500).json({
      status: isClientError ? 400 : 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

// Controller lấy danh sách tất cả khuyến mãi (kèm chi tiết sản phẩm áp dụng)
export const handleGetAllPromotions = async (req, res) => {
  try {
    const { page, limit, status, q } = req.query;

    const result = await promotionService.getAllPromotions({
      page,
      limit,
      status,
      q,
    });

    return res.status(200).json({
      status: 200,
      message: "Lấy danh sách khuyến mãi thành công!",
      data: result.promotions,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Lỗi tại handleGetAllPromotions Controller:", error.message);
    return res.status(500).json({
      status: 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

// Controller cập nhật trạng thái khuyến mãi
export const handleUpdatePromotionStatus = async (req, res) => {
  try {
    const { promotionId } = req.params;
    const { status } = req.body;

    const result = await promotionService.updatePromotionStatus(promotionId, status);

    return res.status(200).json({
      status: 200,
      message: "Cập nhật trạng thái khuyến mãi thành công!",
      data: result,
    });
  } catch (error) {
    console.error("Lỗi tại handleUpdatePromotionStatus Controller:", error.message);

    const isClientError =
      error.message.includes("không hợp lệ") ||
      error.message.includes("Không tìm thấy");

    return res.status(isClientError ? 400 : 500).json({
      status: isClientError ? 400 : 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

// Controller cập nhật thông tin chi tiết khuyến mãi
export const handleUpdatePromotion = async (req, res) => {
  try {
    const { promotionId } = req.params;

    const result = await promotionService.updatePromotion(promotionId, req.body);

    return res.status(200).json({
      status: 200,
      message: "Cập nhật chương trình khuyến mãi thành công!",
      data: result,
    });
  } catch (error) {
    console.error("Lỗi tại handleUpdatePromotion Controller:", error.message);

    const isClientError =
      error.message.includes("không hợp lệ") ||
      error.message.includes("Không tìm thấy") ||
      error.message.includes("không được để trống") ||
      error.message.includes("đã được sử dụng") ||
      error.message.includes("không đúng định dạng") ||
      error.message.includes("phải lớn hơn") ||
      error.message.includes("không được vượt quá") ||
      error.message.includes("không tồn tại");

    return res.status(isClientError ? 400 : 500).json({
      status: isClientError ? 400 : 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

// Controller bổ sung 1 hoặc nhiều sản phẩm vào khuyến mãi
export const handleAddProductsToPromotion = async (req, res) => {
  try {
    const { promotionId } = req.params;

    await promotionService.addProductsToPromotion(promotionId, req.body);

    return res.status(200).json({
      status: 200,
      message: "Thêm sản phẩm vào chương trình khuyến mãi thành công!",
    });
  } catch (error) {
    console.error("Lỗi tại handleAddProductsToPromotion Controller:", error.message);

    const isClientError =
      error.message.includes("không được để trống") ||
      error.message.includes("Không tìm thấy") ||
      error.message.includes("không tồn tại") ||
      error.message.includes("đã tồn tại");

    return res.status(isClientError ? 400 : 500).json({
      status: isClientError ? 400 : 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

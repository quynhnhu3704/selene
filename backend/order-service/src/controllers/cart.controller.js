// backend\order-service\src\controllers\cart.controller.js
import * as cartService from "../services/cart.service.js";

// thêm vào giỏ hàng
export const handleAddItemToCart = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const { product_id, variant_id, quantity } = req.body;

    // Gọi service xử lý logic
    const result = await cartService.addItemToCart(accountId, {
      product_id,
      variant_id,
      quantity,
    });

    // Trả về thông báo động dựa trên việc có tạo giỏ mới hay không
    const successMessage = result.is_new_cart
      ? "Thêm sản phẩm vào giỏ hàng thành công!"
      : "Thêm sản phẩm vào giỏ hàng thành công!";

    return res.status(200).json({
      status: 200,
      message: successMessage,
      data: result,
    });
  } catch (error) {
    console.error("Lỗi tại handleAddItemToCart Controller:", error.message);
    const statusCode =
      error.message &&
      (error.message.includes("Không thể") ||
        error.message.includes("Hệ thống đang bận"))
        ? 500
        : 400;
    return res.status(statusCode).json({
      status: statusCode,
      message: error.message || "Internal Server Error!",
    });
  }
};

// xem giỏ hàng
export const handleGetCart = async (req, res) => {
  try {
    const accountId = req.user?.accountId;

    const result = await cartService.getCart(accountId);

    return res.status(200).json({
      status: 200,
      message: "Lấy thông tin giỏ hàng thành công",
      data: result,
    });
  } catch (error) {
    console.error("Lỗi tại handleGetCart Controller:", error.message);
    return res.status(500).json({
      status: 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

// xóa item khỏi giỏ hàng
export const handleRemoveItemFromCart = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const { cartItemId } = req.params;

    const result = await cartService.removeItemFromCart(accountId, cartItemId);

    return res.status(200).json({
      status: 200,
      message: "Xóa sản phẩm khỏi giỏ hàng thành công",
      data: result,
    });
  } catch (error) {
    console.error(
      "Lỗi tại handleRemoveItemFromCart Controller:",
      error.message,
    );
    return res.status(500).json({
      status: 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

// giảm số lượng item trong giỏ hàng
export const handleDecreaseItemQuantity = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const { cartItemId } = req.params;

    const result = await cartService.decreaseItemQuantity(
      accountId,
      cartItemId,
    );

    return res.status(200).json({
      status: 200,
      message: "Cập nhật số lượng sản phẩm thành công",
      data: result,
    });
  } catch (error) {
    console.error(
      "Lỗi tại handleDecreaseItemQuantity Controller:",
      error.message,
    );
    return res.status(500).json({
      status: 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

// tăng số lượng item trong giỏ hàng
export const handleIncreaseItemQuantity = async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const { cartItemId } = req.params;

    const result = await cartService.increaseItemQuantity(
      accountId,
      cartItemId,
    );

    return res.status(200).json({
      status: 200,
      message: "Cập nhật số lượng sản phẩm thành công",
      data: result,
    });
  } catch (error) {
    console.error(
      "Lỗi tại handleIncreaseItemQuantity Controller:",
      error.message,
    );
    const statusCode =
      error.message &&
      (error.message.includes("Không thể") ||
        error.message.includes("Hệ thống đang bận"))
        ? 500
        : 400;
    return res.status(statusCode).json({
      status: statusCode,
      message: error.message || "Internal Server Error!",
    });
  }
};

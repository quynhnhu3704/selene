// backend\order-service\src\services\cart.service.js
import { CartModel } from "../models/cart.model.js";
import { requestProductDetails } from "../configs/rabbitmq.js";

const generateId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

// In-memory cache thông tin tồn kho biến thể sản phẩm (TTL 60s)
const variantCache = new Map();

export const fetchVariantStock = async (variantId) => {
  // 1. Kiểm tra cache RAM (0ms)
  const cached = variantCache.get(variantId);
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.stock;
  }

  // 2. Lấy thông tin từ product-service qua RabbitMQ RPC
  const details = await requestProductDetails([variantId]);
  const stock = details?.[0]?.stock_quantity || 0;
  variantCache.set(variantId, { stock, timestamp: Date.now() });
  return stock;
};

// thêm vào giỏ hàng
export const addItemToCart = async (accountId, productInfo) => {
  try {
    const { product_id, variant_id, quantity } = productInfo;
    const itemQuantity = quantity || 1;

    if (!accountId || !product_id || !variant_id) {
      throw new Error("Thiếu thông tin bắt buộc!");
    }

    // 1. Kiểm tra tồn kho siêu tốc và lấy giỏ hàng ĐỒNG THỜI (chỉ mất ~40ms)
    const [stock, cartData] = await Promise.all([
      fetchVariantStock(variant_id).catch((err) => {
        console.error("Lỗi khi kiểm tra tồn kho:", err);
        throw new Error(
          "Hệ thống đang bận, không thể kiểm tra thông tin sản phẩm lúc này",
        );
      }),
      CartModel.getCartWithItems(accountId),
    ]);

    let cart = cartData;
    let existingItem = null;
    let currentTotalQuantity = 0;

    if (!cart) {
      const newCartData = {
        cart_id: generateId("cart"),
        account_id: accountId,
      };
      cart = await CartModel.createCart(newCartData);
    } else {
      const items = cart.cart_items || [];
      existingItem = items.find(
        (i) => i.product_id === product_id && i.variant_id === variant_id,
      );
      currentTotalQuantity = items.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0,
      );
    }

    const totalRequestedQuantity = existingItem
      ? existingItem.quantity + itemQuantity
      : itemQuantity;

    if (stock <= 0 || stock < totalRequestedQuantity) {
      throw new Error("Sản phẩm bạn chọn đã hết");
    }

    // 2. Ghi DB (chỉ 1 câu UPDATE hoặc INSERT duy nhất ~30ms)
    let resultItemId;
    if (existingItem) {
      resultItemId = existingItem.cart_item_id;
      await CartModel.updateItemQuantity(
        existingItem.cart_item_id,
        totalRequestedQuantity,
      );
    } else {
      resultItemId = generateId("item");
      const newCartItemData = {
        cart_item_id: resultItemId,
        cart_id: cart.cart_id,
        product_id: product_id,
        variant_id: variant_id,
        quantity: itemQuantity,
      };
      await CartModel.addCartItem(newCartItemData);
    }

    const finalTotalQuantity = currentTotalQuantity + itemQuantity;

    // 3. Trả kết quả ngay lập tức
    return {
      cart_id: cart.cart_id,
      cart_item_id: resultItemId,
      total_quantity: finalTotalQuantity,
    };
  } catch (error) {
    console.error("Lỗi tại addItemToCart Service:", error.message);
    throw new Error(
      error.message || "Không thể xử lý thêm sản phẩm vào giỏ hàng!",
    );
  }
};

// lấy danh sách giỏ hàng
export const getCart = async (accountId) => {
  try {
    if (!accountId) {
      throw new Error("Thiếu thông tin người dùng!");
    }

    // 1. Tìm giỏ hàng
    const cart = await CartModel.findByAccountId(accountId);
    if (!cart) {
      return { items: [], total_quantity: 0, total_price: 0 };
    }

    // 2. Lấy danh sách items
    const cartItems = await CartModel.getCartItems(cart.cart_id);

    if (!cartItems || cartItems.length === 0) {
      return { items: [], total_quantity: 0, total_price: 0 };
    }

    // 3. Lấy variant_ids
    const variantIds = cartItems.map((item) => item.variant_id);

    // 4. Gửi request qua RabbitMQ RPC để lấy thông tin chi tiết
    let productDetails = [];
    try {
      productDetails = await requestProductDetails(variantIds);
    } catch (err) {
      console.error("Lỗi khi gọi RPC RabbitMQ:", err);
      throw new Error(
        "Không thể lấy thông tin sản phẩm lúc này. Vui lòng thử lại sau.",
      );
    }

    // 5. Gộp dữ liệu
    let totalQuantity = 0;
    let totalPrice = 0;

    const populatedItems = cartItems.map((item) => {
      const detail = productDetails.find(
        (p) => p.variant_id === item.variant_id,
      );

      const itemQuantity = item.quantity || 0;
      const itemPrice = detail
        ? detail.discount_price || detail.original_price || 0
        : 0;

      totalQuantity += itemQuantity;
      totalPrice += itemPrice * itemQuantity;

      return {
        cart_item_id: item.cart_item_id,
        quantity: itemQuantity,
        product: detail || {
          product_id: item.product_id,
          variant_id: item.variant_id,
          error: "Sản phẩm không còn tồn tại",
        },
      };
    });

    return {
      items: populatedItems,
      total_quantity: totalQuantity,
      total_price: totalPrice,
    };
  } catch (error) {
    console.error("Lỗi tại getCart Service:", error.message);
    throw new Error(error.message || "Không thể lấy giỏ hàng!");
  }
};

// xóa item khỏi giỏ hàng
export const removeItemFromCart = async (accountId, cartItemId) => {
  try {
    if (!accountId || !cartItemId) {
      throw new Error("Thiếu thông tin bắt buộc!");
    }

    // 1. Tìm giỏ hàng của user
    const cart = await CartModel.findByAccountId(accountId);
    if (!cart) {
      return { total_quantity: 0 };
    }

    // 2. Xóa sản phẩm khỏi giỏ hàng
    await CartModel.removeCartItem(cartItemId);

    // 3. Tính lại tổng số lượng
    const totalQuantity = await CartModel.getTotalQuantity(cart.cart_id);

    // Nếu giỏ hàng đã trống trơn, dọn dẹp ngầm
    if (totalQuantity === 0) {
      CartModel.deleteCart(cart.cart_id).catch((err) => {
        console.warn("Lỗi dọn dẹp giỏ hàng rỗng ngầm:", err.message);
      });
    }

    return {
      total_quantity: totalQuantity,
    };
  } catch (error) {
    console.error("Lỗi tại removeItemFromCart Service:", error.message);
    throw new Error(error.message || "Không thể xóa sản phẩm khỏi giỏ hàng!");
  }
};

// giảm số lượng item trong giỏ hàng
export const decreaseItemQuantity = async (accountId, cartItemId) => {
  try {
    if (!accountId || !cartItemId) {
      throw new Error("Thiếu thông tin bắt buộc!");
    }

    // 1. Lấy thông tin item để kiểm tra số lượng hiện tại
    const cartItem = await CartModel.getCartItemByIdAndAccount(
      cartItemId,
      accountId,
    );

    if (!cartItem) {
      throw new Error("Sản phẩm không tồn tại trong giỏ hàng của bạn!");
    }

    const currentQuantity = cartItem.quantity;

    // 2. Kiểm tra nếu số lượng <= 1 thì xóa luôn
    if (currentQuantity <= 1) {
      return await removeItemFromCart(accountId, cartItemId);
    }

    // 3. Nếu số lượng > 1 thì giảm đi 1
    await CartModel.updateItemQuantity(cartItemId, currentQuantity - 1);

    // 4. Trả kết quả (tính lại tổng số lượng)
    const cart = await CartModel.findByAccountId(accountId);
    let totalQuantity = 0;
    if (cart) {
      totalQuantity = await CartModel.getTotalQuantity(cart.cart_id);
    }

    return {
      new_quantity: currentQuantity - 1,
      total_quantity: totalQuantity,
    };
  } catch (error) {
    console.error("Lỗi tại decreaseItemQuantity Service:", error.message);
    throw new Error(error.message || "Không thể giảm số lượng sản phẩm!");
  }
};

// tăng số lượng item trong giỏ hàng
export const increaseItemQuantity = async (accountId, cartItemId) => {
  try {
    if (!accountId || !cartItemId) {
      throw new Error("Thiếu thông tin bắt buộc!");
    }

    // 1. Lấy thông tin item để kiểm tra số lượng hiện tại
    const cartItem = await CartModel.getCartItemByIdAndAccount(
      cartItemId,
      accountId,
    );

    if (!cartItem) {
      throw new Error("Sản phẩm không tồn tại trong giỏ hàng của bạn!");
    }

    const currentQuantity = cartItem.quantity;
    const { variant_id } = cartItem;

    // 2. Kiểm tra tồn kho siêu tốc
    let stock = 0;
    try {
      stock = await fetchVariantStock(variant_id);
    } catch (err) {
      console.error("Lỗi khi kiểm tra tồn kho:", err);
      throw new Error(
        "Hệ thống đang bận, không thể kiểm tra thông tin sản phẩm lúc này",
      );
    }

    if (stock <= 0 || stock < currentQuantity + 1) {
      throw new Error("Sản phẩm bạn chọn đã hết");
    }

    // 3. Tăng số lượng đi 1
    await CartModel.updateItemQuantity(cartItemId, currentQuantity + 1);

    // 4. Trả kết quả (tính lại tổng số lượng)
    const cart = await CartModel.findByAccountId(accountId);
    let totalQuantity = 0;
    if (cart) {
      totalQuantity = await CartModel.getTotalQuantity(cart.cart_id);
    }

    return {
      new_quantity: currentQuantity + 1,
      total_quantity: totalQuantity,
    };
  } catch (error) {
    console.error("Lỗi tại increaseItemQuantity Service:", error.message);
    throw new Error(error.message || "Không thể tăng số lượng sản phẩm!");
  }
};

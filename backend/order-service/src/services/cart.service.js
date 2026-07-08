import { CartModel } from '../models/cart.model.js';

const generateId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

export const addItemToCart = async (accountId, productInfo) => {
  try {
    const { product_id, variant_id, quantity } = productInfo;
    const itemQuantity = quantity || 1;

    if (!accountId || !product_id || !variant_id) {
      throw new Error('Thiếu thông tin bắt buộc!');
    }

    // 1. Tìm hoặc tạo giỏ hàng
    let cart = await CartModel.findByAccountId(accountId);

    if (!cart) {
      const newCartData = {
        cart_id: generateId('cart'),
        account_id: accountId
      };
      cart = await CartModel.createCart(newCartData);
    }

    // 2. XỬ LÝ SẢN PHẨM: Kiểm tra trùng lặp
    let finalItem;
    const existingItem = await CartModel.findItemInCart(cart.cart_id, product_id, variant_id);

    if (existingItem) {
      // Trường hợp ĐÃ CÓ: Lấy số lượng cũ + số lượng mới add thêm vào
      const newQuantity = existingItem.quantity + itemQuantity;
      finalItem = await CartModel.updateItemQuantity(existingItem.cart_item_id, newQuantity);
    } else {
      // Trường hợp CHƯA CÓ: Tạo dòng mới tinh
      const newCartItemData = {
        cart_item_id: generateId('item'),
        cart_id: cart.cart_id,
        product_id: product_id,
        variant_id: variant_id,
        quantity: itemQuantity
      };
      finalItem = await CartModel.addCartItem(newCartItemData);
    }

    // 3. Tính toán tổng số lượng sản phẩm mới nhất của giỏ hàng để trả về
    const finalTotalQuantity = await CartModel.getTotalQuantity(cart.cart_id);

    // 4. Trả kết quả ra ngoài
    return {
    //   cart_id: cart.cart_id,
    //   added_item: finalItem,
      total_quantity: finalTotalQuantity 
    };

  } catch (error) {
    console.error('Lỗi tại addItemToCart Service:', error.message);
    throw new Error(error.message || 'Không thể xử lý thêm sản phẩm vào giỏ hàng!');
  }
};
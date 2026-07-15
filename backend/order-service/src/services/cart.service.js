// backend\order-service\src\services\cart.service.js
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

    // 1. Kiểm tra tồn kho và tính hợp lệ của sản phẩm thông qua Product Service
    let productData;
    try {
      const response = await fetch(`http://localhost:8002/product-detail/${product_id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Sản phẩm không tồn tại!');
        }
        throw new Error('Lỗi kết nối đến Product Service');
      }
      const json = await response.json();
      productData = json.data;
    } catch (err) {
      if (err.message === 'Sản phẩm không tồn tại!') throw err;
      console.error('Lỗi fetch Product Service:', err);
      throw new Error('Hệ thống đang bận, không thể kiểm tra thông tin sản phẩm lúc này');
    }

    if (!productData) {
      throw new Error('Sản phẩm không tồn tại!');
    }

    const variant = (productData.variants || []).find(v => v.variant_id === variant_id);
    if (!variant) {
      throw new Error('Biến thể sản phẩm không tồn tại!');
    }

    const stock = variant.stock_quantity || 0;

    // 1. Tìm hoặc tạo giỏ hàng
    let cart = await CartModel.findByAccountId(accountId);

    if (!cart) {
      const newCartData = {
        cart_id: generateId('cart'),
        account_id: accountId
      };
      cart = await CartModel.createCart(newCartData);
    }

    // 3. XỬ LÝ SẢN PHẨM: Kiểm tra trùng lặp và tồn kho
    let finalItem;
    const existingItem = await CartModel.findItemInCart(cart.cart_id, product_id, variant_id);

    const totalRequestedQuantity = existingItem ? existingItem.quantity + itemQuantity : itemQuantity;

    if (stock <= 0) {
      throw new Error('Đã hết mặt hàng này');
    }

    if (stock < totalRequestedQuantity) {
      throw new Error(`Chỉ còn ${stock} sản phẩm`);
    }

    if (existingItem) {
      // Trường hợp ĐÃ CÓ: Lấy số lượng cũ + số lượng mới add thêm vào
      finalItem = await CartModel.updateItemQuantity(existingItem.cart_item_id, totalRequestedQuantity);
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

import { requestProductDetails } from '../configs/rabbitmq.js';

export const getCart = async (accountId) => {
  try {
    if (!accountId) {
      throw new Error('Thiếu thông tin người dùng!');
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
    const variantIds = cartItems.map(item => item.variant_id);

    // 4. Gửi request qua RabbitMQ RPC để lấy thông tin chi tiết
    let productDetails = [];
    try {
      productDetails = await requestProductDetails(variantIds);
    } catch (err) {
      console.error('Lỗi khi gọi RPC RabbitMQ:', err);
      throw new Error('Không thể lấy thông tin sản phẩm lúc này. Vui lòng thử lại sau.');
    }

    // 5. Gộp dữ liệu
    let totalQuantity = 0;
    let totalPrice = 0;

    const populatedItems = cartItems.map(item => {
      const detail = productDetails.find(p => p.variant_id === item.variant_id);
      
      const itemQuantity = item.quantity || 0;
      const itemPrice = detail ? (detail.discount_price || detail.original_price || 0) : 0;
      
      totalQuantity += itemQuantity;
      totalPrice += itemPrice * itemQuantity;

      return {
        cart_item_id: item.cart_item_id,
        quantity: itemQuantity,
        product: detail || { 
          product_id: item.product_id, 
          variant_id: item.variant_id, 
          error: 'Sản phẩm không còn tồn tại' 
        }
      };
    });

    return {
      items: populatedItems,
      total_quantity: totalQuantity,
      total_price: totalPrice
    };

  } catch (error) {
    console.error('Lỗi tại getCart Service:', error.message);
    throw new Error(error.message || 'Không thể lấy giỏ hàng!');
  }
};

export const removeItemFromCart = async (accountId, cartItemId) => {
  try {
    if (!accountId || !cartItemId) {
      throw new Error('Thiếu thông tin bắt buộc!');
    }

    // 1. Kiểm tra xem người dùng có quyền xóa sản phẩm này không (có nằm trong giỏ của họ không)
    const isOwner = await CartModel.verifyItemBelongsToAccount(cartItemId, accountId);
    
    if (!isOwner) {
      throw new Error('Sản phẩm không tồn tại trong giỏ hàng của bạn!');
    }

    // 2. Xóa
    await CartModel.removeCartItem(cartItemId);
    
    // 3. Trả kết quả (có thể tính lại tổng số lượng)
    const cart = await CartModel.findByAccountId(accountId);
    let totalQuantity = 0;
    if (cart) {
      totalQuantity = await CartModel.getTotalQuantity(cart.cart_id);
    }
    
    return {
      total_quantity: totalQuantity
    };
  } catch (error) {
    console.error('Lỗi tại removeItemFromCart Service:', error.message);
    throw new Error(error.message || 'Không thể xóa sản phẩm khỏi giỏ hàng!');
  }
};
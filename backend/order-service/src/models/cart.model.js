// backend\order-service\src\models\cart.model.js
import { supabase } from '../configs/supabase.js';

export const CartModel = {
  // Tìm giỏ hàng hiện có của User
  findByAccountId: async (accountId) => {
    const { data, error } = await supabase
      .from('carts')
      .select('cart_id')
      .eq('account_id', accountId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; 
    return data;
  },

  // Tìm kiếm xem item đã tồn tại trong giỏ chưa
  findItemInCart: async (cartId, productId, variantId) => {
    const { data, error } = await supabase
      .from('cart_items')
      .select('cart_item_id, quantity')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .eq('variant_id', variantId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; 
    return data;
  },

  // Tính tổng số lượng tất cả sản phẩm trong một giỏ hàng
  getTotalQuantity: async (cartId) => {
    const { data, error } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('cart_id', cartId);

    if (error) throw error;

    // Tính tổng trường quantity của tất cả các dòng tìm được
    const totalQuantity = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
    return totalQuantity;
  },

  // Cập nhật lại số lượng của item cũ
  updateItemQuantity: async (cartItemId, newQuantity) => {
    const { data, error } = await supabase
      .from('cart_items')
      .update({ 
        quantity: newQuantity,
        updated_at: new Date()
      })
      .eq('cart_item_id', cartItemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Tạo giỏ hàng mới
  createCart: async (cartData) => {
    const { data, error } = await supabase
      .from('carts')
      .insert([cartData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Thêm sản phẩm vào giỏ hàng
  addCartItem: async (itemData) => {
    const { data, error } = await supabase
      .from('cart_items')
      .insert([itemData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
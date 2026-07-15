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
  },

  // Lấy danh sách item trong giỏ hàng
  getCartItems: async (cartId) => {
    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cartId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Xóa sản phẩm khỏi giỏ hàng
  removeCartItem: async (cartItemId) => {
    const { data, error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_item_id', cartItemId)
      .select()
      .single();

    // supabase có thể trả về lỗi nếu không tìm thấy bản ghi để xóa (hoặc trả về mảng rỗng)
    if (error) throw error;
    return data;
  },

  // Kiểm tra quyền sở hữu của user với cart_item (tránh user này xóa đồ của user khác)
  verifyItemBelongsToAccount: async (cartItemId, accountId) => {
    // Join 2 bảng cart_items và carts để kiểm tra
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        cart_item_id,
        carts!inner (
          account_id
        )
      `)
      .eq('cart_item_id', cartItemId)
      .eq('carts.account_id', accountId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data !== null;
  }
};
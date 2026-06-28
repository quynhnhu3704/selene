import { supabase } from '../configs/supabase.js';

export const ProductModel = {
  // Lấy tất cả sản phẩm (Có phân trang)
  getProductsWithPagination: async (from, to) => {
    const { data, error, count } = await supabase
      .from('products')
      .select(`
        product_id,
        product_name,
        image_urls,
        original_price,
        discount_price
      `, { count: 'exact' }) // Đếm tổng số bản ghi thực tế trong DB
      .eq('status', 'active') // Chỉ hiển thị các sản phẩm đang mở bán công khai
      .order('created_at', { ascending: false }) // Sản phẩm mới nhất xếp lên đầu
      .range(from, to); // Cắt dữ liệu theo trang

    if (error) throw error;
    return { data, count };
  },

  // Lấy thông tin chi tiết sản phẩm & tên thương hiệu
  getProductById: async (productId) => {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        product_id,
        product_name,
        image_urls,
        original_price,
        discount_price,
        description,
        brands:brand_id ( name )
      `)
      .eq('product_id', productId)
      .single(); // Chỉ lấy 1 bản ghi duy nhất

    if (productError) throw productError;
    return product;
  },

  // Lấy tất cả các biến thể kích thước / màu sắc của sản phẩm
  getProductVariants: async (productId) => {
    const { data: variants, error: variantError } = await supabase
      .from('product_variants')
      .select('variant_id, size, color, stock_quantity, status')
      .eq('product_id', productId);

    if (variantError) throw variantError;
    return variants;
  },

  // Tìm kiếm sản phẩm theo tên sử dụng ilike
  searchProductsByName: async (keyword, from, to) => {
    const { data, error, count } = await supabase
      .from('products')
      .select(`
        product_id,
        product_name,
        image_urls,
        original_price,
        discount_price
      `, { count: 'exact' })
      .eq('status', 'active') 
      .ilike('product_name', `%${keyword}%`) 
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data, count };
  },

  // Tìm kiếm sản phẩm kèm filter theo danh mục
  searchProductsByCategory: async (categoryName, from, to) => {
    let query = supabase
      .from('products')
      .select(`
        product_id,
        product_name,
        image_urls,
        original_price,
        discount_price,
        categories${categoryName ? '!inner' : ''} (
          name,
          status
        )
      `, { count: 'exact' })
      .eq('status', 'active');
    
    if (categoryName) {
      query = query
        .eq('categories.status', 'active') 
        .ilike('categories.name', `%${categoryName}%`); 
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data, count };
  }
};
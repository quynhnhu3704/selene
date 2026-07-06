// backend\product-service\src\models\product.model.js
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
  },

  // Upload nhiều file lên Supabase Storage
  uploadMultipleFilesToStorage: async (files) => {
    if (!files || files.length === 0) return [];

    const uploadPromises = files.map(async (file) => {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from('products')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (error) throw new Error(`Lỗi upload ảnh lên Storage: ${error.message}`);

      const { data: publicUrlData } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    });

    return await Promise.all(uploadPromises); // Thực thi upload song song
  },

  // Hàm xóa danh sách file trên Supabase Storage dựa vào URL công khai
  deleteFilesFromStorage: async (urls) => {
    if (!urls || urls.length === 0) return;

    const filePaths = urls.map(url => {
      const parts = url.split('/storage/v1/object/public/products/');
      return parts[1]; // Lấy phần sau tên bucket
    }).filter(Boolean);

    if (filePaths.length === 0) return;

    const { error } = await supabase.storage
      .from('products')
      .remove(filePaths);

    if (error) {
      console.error('Lỗi khi xóa file cũ trên Storage:', error.message);
    }
  },

  // Chèn thông tin vào bảng products
  createProduct: async (productData) => {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Chèn hàng loạt biến thể vào bảng product_variants
  createVariants: async (variantsArray) => {
    const { data, error } = await supabase
      .from('product_variants')
      .insert(variantsArray)
      .select();

    if (error) throw error;
    return data;
  },

  // Cập nhật thông tin bảng products chính
  updateProduct: async (productId, productData) => {
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('product_id', productId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Không tìm thấy sản phẩm để cập nhật!');
    return data[0];
  },

  // Chỉ cần duy nhất hàm này để vừa Update vừa Insert biến thể
  upsertVariants: async (variantsArray) => {
    const { data, error } = await supabase
      .from('product_variants')
      .upsert(variantsArray, { 
        onConflict: ['variant_id', 'product_id'] 
      })
      .select();

    if (error) throw error;
    return data;
  }
};
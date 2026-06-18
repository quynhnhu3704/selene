import { supabase } from '../configs/supabase.js';

// Lấy tất cả sản phẩm
export const getAllProduct = async (options = {}) => {
  try {

    // 1. Cấu hình phân trang (Pagination)
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 12;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 2. Gọi vào schema 'product' và bảng 'products'
    // Sử dụng kỹ thuật Select Object Relation để JOIN lấy tên Category và Brand
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

    const formattedProducts = data.map(product => ({
      product_id: product.product_id,
      product_name: product.product_name,
      image_url: getFirstImage(product.image_urls), 
      discount_price: product.discount_price,
      original_price: product.original_price,
    }));

    const totalPages = Math.ceil(count / limit);

    return {
      products: formattedProducts,
      pagination: {
        currentPage: page,
        limit,
        totalItems: count,
        totalPages
      }
    };

  } catch (error) {
    console.error('Lỗi tại getAllProducts:', error.message);
    throw new Error('Không thể kết nối đến Supabase để lấy danh sách sản phẩm!');
  }
};


// xem chi tiết sản phẩm
export const getProductDetail = async (productId) => {
  try {
    // 1. Lấy thông tin chi tiết sản phẩm & tên thương hiệu
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

    if (productError || !product) throw new Error('Sản phẩm không tồn tại!');

    // 2. Lấy tất cả các biến thể kích thước / màu sắc của sản phẩm này
    const { data: variants, error: variantError } = await supabase
      .from('product_variants')
      .select('variant_id, size, color, stock_quantity, status')
      .eq('product_id', productId);

    if (variantError) throw variantError;

    // Xử lý parse mảng ảnh an toàn
    let images = product.image_urls;
    if (typeof product.image_urls === 'string') {
      try { images = JSON.parse(product.image_urls); } catch (e) { images = [product.image_urls]; }
    }

    // Trả về cục data tổng hợp hoàn chỉnh
    return {
      product_id: product.product_id,
      product_name: product.product_name,
      images: images, 
      original_price: product.original_price,
      discount_price: product.discount_price,
      description: product.description,
      brand_name: product.brands?.name || null,
      variants: variants      
    };

  } catch (error) {
    console.error('Lỗi tại getProductDetailService:', error.message);
    throw error;
  }
};


// Tìm kiếm sản phẩm theo tên
export const searchProductsByName = async (options = {}) => {
  try {
    const { keyword = '', page = 1, limit = 12 } = options;
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Truy vấn Supabase sử dụng toán tử .ilike() để tìm kiếm tương đối và không phân biệt hoa thường
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

    const formattedProducts = data.map(product => ({
      product_id: product.product_id,
      product_name: product.product_name,
      image_url: getFirstImage(product.image_urls), 
      discount_price: product.discount_price,       
      original_price: product.original_price,
    }));

    const totalPages = Math.ceil(count / limit);

    return {
      products: formattedProducts,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        totalItems: count,
        totalPages
      }
    };

  } catch (error) {
    console.error('Lỗi tại searchProductsService:', error.message);
    throw new Error('Không thể tìm kiếm sản phẩm từ Supabase!');
  }
};


// tìm kiếm sp theo danh mục
export const searchProductsByCategoryName = async (options = {}) => {
  try {
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 12;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const categoryName = options.categoryName ? options.categoryName.trim() : '';

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

    const formattedProducts = data.map(product => ({
      product_id: product.product_id,
      product_name: product.product_name,
      image_url: getFirstImage(product.image_urls),
      discount_price: product.discount_price,
      original_price: product.original_price,
      category_name: product.categories?.name || null 
    }));

    const totalPages = Math.ceil(count / limit);

    return {
      products: formattedProducts,
      pagination: {
        currentPage: page,
        limit,
        totalItems: count,
        totalPages
      }
    };

  } catch (error) {
    console.error('Lỗi tại searchProductsByCategoryName Service:', error.message);
    throw new Error('Không thể tìm kiếm sản phẩm theo danh mục!');
  }
};


//  Hàm dùng chung: Trích xuất 1 tấm ảnh đầu tiên từ dữ liệu image_urls trong DB
const getFirstImage = (imageUrlsData) => {
  if (!imageUrlsData) return "";
  
  let parsedImages = imageUrlsData;

  // Nếu dữ liệu trả về dạng chuỗi Text (chưa parse), tiến hành parse sang Mảng
  if (typeof imageUrlsData === 'string') {
    try { 
      parsedImages = JSON.parse(imageUrlsData); 
    } catch (e) { 
      parsedImages = [imageUrlsData]; 
    }
  }

  // Nếu là mảng và có phần tử, lấy phần tử đầu tiên [0]
  if (Array.isArray(parsedImages) && parsedImages.length > 0) {
    return parsedImages[0];
  } 
  
  // Trường hợp dữ liệu sau khi xử lý vẫn là chuỗi URL đơn thuần
  if (typeof parsedImages === 'string') {
    return parsedImages;
  }

  return "";
};
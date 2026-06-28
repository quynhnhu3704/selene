import { ProductModel } from '../models/product.model.js';

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

// Lấy tất cả sản phẩm
export const getAllProduct = async (options = {}) => {
  try {
    // 1. Cấu hình phân trang (Pagination)
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 12;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 2. Gọi Model lấy dữ liệu từ DB
    const { data, count } = await ProductModel.getProductsWithPagination(from, to);

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
    // 1. Gọi Model lấy chi tiết sản phẩm
    const product = await ProductModel.getProductById(productId);
    if (!product) throw new Error('Sản phẩm không tồn tại!');

    // 2. Gọi Model lấy các biến thể kích thước / màu sắc
    const variants = await ProductModel.getProductVariants(productId);

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
    // Giữ nguyên logic throw error gốc hoặc câu thông báo lỗi tùy biến
    if (error.message === 'Sản phẩm không tồn tại!' || error.code === 'PGRST116') {
      throw new Error('Sản phẩm không tồn tại!');
    }
    throw error;
  }
};

// Tìm kiếm sản phẩm theo tên
export const searchProductsByName = async (options = {}) => {
  try {
    const { keyword = '', page = 1, limit = 12 } = options;
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Truy vấn thông qua Model
    const { data, count } = await ProductModel.searchProductsByName(keyword, from, to);

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

    // Truy vấn lọc theo danh mục thông qua Model
    const { data, count } = await ProductModel.searchProductsByCategory(categoryName, from, to);

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
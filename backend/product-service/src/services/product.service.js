// backend\product-service\src\services\product.service.js
import { ProductModel } from '../models/product.model.js';
import { BrandModel } from '../models/brand.model.js';

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
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

// thêm sp
export const createProductWithVariants = async (inputData, files) => {
  try {
    const {
      category_id, brand_id,
      product_name, price, original_price, discount_price, description, status, variants, brand_name
    } = inputData;

    // Ép kiểu mảng cho variants vì khi gửi qua FormData nó có thể bị chuyển thành chuỗi JSON
    const parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    if (!parsedVariants || !Array.isArray(parsedVariants) || parsedVariants.length === 0) {
      throw new Error('Sản phẩm phải có ít nhất một biến thể (Size/Color)!');
    }

    // lấy tên thương hiệu
    const dbBrandName = await BrandModel.getBrandNameById(brand_id);
    if (!dbBrandName) {
      throw new Error(`Mã thương hiệu (brand_id) '${brand_id}' không tồn tại trên hệ thống!`);
    }

    // 3. Xử lý upload N hình ảnh lên Supabase Storage
    const uploadedImageUrls = await ProductModel.uploadMultipleFilesToStorage(files);

    const currentTime = new Date().toISOString();
    const productId = generateId();
    const cleanBrandName = (brand_name || 'BRAND').trim().toUpperCase();

    // 4. Chuẩn bị dữ liệu cho bảng Product
    const productData = {
      product_id: productId,
      category_id,
      brand_id,
      product_name: product_name.trim(),
      image_urls: JSON.stringify(uploadedImageUrls),
      product_url: null, 
      price,
      original_price,
      discount_price,
      description,
      status: status || 'active',
      created_at: currentTime,
      updated_at: currentTime
    };

    // 5. Chuẩn bị dữ liệu cho bảng Variants (Tự động tạo SKU)
    const variantsData = parsedVariants.map(v => {
      const cleanSize = v.size.trim();
      const cleanColor = v.color.trim();
      const variant_id = `${cleanBrandName}-${productId}-${cleanSize}-${cleanColor.toUpperCase()}`.replace(/\s+/g, '');

      return {
        variant_id,
        product_id: productId,
        size: v.size,
        color: v.color,
        stock_quantity: v.stock_quantity || 0,
        status: v.status || 'active',
        created_at: currentTime,
        updated_at: currentTime
      };
    });

    // 6. Thực thi lưu vào Database
    const newProduct = await ProductModel.createProduct(productData);
    const newVariants = await ProductModel.createVariants(variantsData);

    return {
      ...newProduct,
      image_urls: uploadedImageUrls, 
      variants: newVariants
    };

  } catch (error) {
    console.error('Lỗi tại createProductWithVariants Service:', error.message);
    throw error;
  }
};
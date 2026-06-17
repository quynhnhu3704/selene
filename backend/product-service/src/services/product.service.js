import { supabase } from '../configs/supabase.js';

// Lấy tất cả sản phẩm
export const getAllProduct = async (options = {}) => {
  try {

    // 1. Cấu hình phân trang (Pagination)
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 9;
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
        price,
        original_price,
        discount_price
      `, { count: 'exact' }) // Đếm tổng số bản ghi thực tế trong DB
      .eq('status', 'active') // Chỉ hiển thị các sản phẩm đang mở bán công khai
      .order('created_at', { ascending: false }) // Sản phẩm mới nhất xếp lên đầu
      .range(from, to); // Cắt dữ liệu theo trang

    if (error) throw error;

    // ── XỬ LÝ CHUYỂN MẢNG ẢNH THÀNH 1 HÌNH DUY NHẤT TẠI ĐÂY ──
    const formattedProducts = data.map(product => {
      let firstImage = ""; // Mặc định nếu không có ảnh

      if (product.image_urls) {
        let parsedImages = product.image_urls;
        
        // Nếu Supabase trả về dạng chuỗi Text (chưa parse), ta tiến hành parse sang Mảng
        if (typeof product.image_urls === 'string') {
          try { 
            parsedImages = JSON.parse(product.image_urls); 
          } catch (e) { 
            parsedImages = [product.image_urls]; 
          }
        }

        // Nếu sau khi parse đã là mảng và có phần tử, lấy phần tử đầu tiên [0]
        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          firstImage = parsedImages[0];
        } else if (typeof parsedImages === 'string') {
          // Trường hợp trong DB lưu thẳng 1 chuỗi URL duy nhất thay vì mảng
          firstImage = parsedImages;
        }
      }

      return {
        product_id: product.product_id,
        product_name: product.product_name,
        image_urls: firstImage,
        discount_price: product.discount_price,
        original_price: product.original_price,
      };
    });

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
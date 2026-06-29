import { BrandModel } from '../models/brand.model.js'; // Đảm bảo đúng đường dẫn và đuôi .js

export const getAllBrands = async (options = {}) => {
  try {
    // 1. Cấu hình phân trang (Pagination)
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 10; // Mặc định hiển thị 10 thương hiệu/trang
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 2. Gọi Model lấy dữ liệu từ Supabase
    const { data, count } = await BrandModel.getBrandsWithPagination(from, to);

    // 3. Tính toán tổng số trang
    const totalPages = Math.ceil(count / limit);

    return {
      brands: data,
      pagination: {
        currentPage: page,
        limit,
        totalItems: count,
        totalPages
      }
    };

  } catch (error) {
    console.error('Lỗi tại getAllBrands Service:', error.message);
    throw new Error('Không thể kết nối đến Supabase để lấy danh sách thương hiệu!');
  }
};
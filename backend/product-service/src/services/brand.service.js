import { BrandModel } from '../models/brand.model.js'; // Đảm bảo đúng đường dẫn và đuôi .js

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

// lấy danh sách brand
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

// thêm brand
export const createBrand = async (brandInput) => {
  try {
    const { name, description, status } = brandInput;

    // 1. Kiểm tra bắt buộc
    if (!name || name.trim() === '') {
      throw new Error('Tên thương hiệu là bắt buộc và không được để trống!');
    }

    // 2. Kiểm tra trùng tên trong hệ thống
    const isExists = await BrandModel.checkNameExists(name.trim());
    if (isExists) {
      throw new Error(`Thương hiệu với tên '${name}' đã tồn tại trên hệ thống!`);
    }

    // 3. Tự sinh mã định danh brand_id (Ví dụ: BRD-K28A1F)
    const brand_id = 'brand-' + generateId();

    // 4. Lấy thời gian từ Node.js
    const currentTime = new Date().toISOString();

    const newBrand = await BrandModel.create({
      brand_id,
      name: name.trim(),
      description,
      status,
      created_at: currentTime,
      updated_at: currentTime
    });

    return newBrand;

  } catch (error) {
    console.error('Lỗi tại createBrand Service:', error.message);
    throw error;
  }
}
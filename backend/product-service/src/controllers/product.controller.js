import * as productService from '../services/product.service.js';

// lấy tất cả sản phẩm
export const handleGetAllProducts = async (req, res) => {
  try {
    const { page, limit } = req.query;

    // Gọi xuống service để truy vấn dữ liệu từ Supabase
    const result = await productService.getAllProduct({ page, limit });

    // Trả về dữ liệu kèm cấu trúc JSON chuẩn của hệ thống
    return res.status(200).json({
      status: 200,
      message: 'Lấy danh sách sản phẩm thành công!',
      data: result.products,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Lỗi tại handleGetAllProducts Controller:', error.message);
    return res.status(500).json({
      status: 500,
      message: error.message || 'Internal Server Error!'
    });
  }
};
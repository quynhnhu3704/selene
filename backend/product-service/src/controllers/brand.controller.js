import * as brandService from '../services/brand.service.js';

export const handleGetAllBrands = async (req, res) => {
  try {
    const { page, limit } = req.query;

    // Gọi xuống service xử lý logic phân trang
    const result = await brandService.getAllBrands({ page, limit });

    // Trả về cấu trúc JSON chuẩn của hệ thống
    return res.status(200).json({
      status: 200,
      message: 'Lấy danh sách thương hiệu thành công!',
      data: result.brands,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Lỗi tại handleGetAllBrands Controller:', error.message);
    return res.status(500).json({
      status: 500,
      message: error.message || 'Internal Server Error!'
    });
  }
};
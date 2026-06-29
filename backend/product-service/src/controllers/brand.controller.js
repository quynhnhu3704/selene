import * as brandService from '../services/brand.service.js';

// lấy danh sách brand
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

// thêm brand
export const handleCreateBrand = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    // Gọi service xử lý nghiệp vụ
    const result = await brandService.createBrand({ name, description, status });

    return res.status(201).json({
      status: 201,
      message: 'Tạo mới thương hiệu thành công!',
      data: result
    });

  } catch (error) {
    console.error('Lỗi tại handleCreateBrand Controller:', error.message);

    // Phân tách lỗi Client (400) vs lỗi Server (500)
    const isClientError = error.message.includes('bắt buộc') || error.message.includes('đã tồn tại');

    return res.status(isClientError ? 400 : 500).json({
      status: isClientError ? 400 : 500,
      message: error.message || 'Internal Server Error!'
    });
  }
};
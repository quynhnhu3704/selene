import * as categoryService from '../services/category.service.js';

// thêm category
export const handleCreateCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    // Gọi service xử lý logic nghiệp vụ
    const result = await categoryService.createCategory({ name, description, status });

    // Trả về response thành công đúng format của hệ thống
    return res.status(201).json({
      status: 201,
      message: 'Tạo mới danh mục sản phẩm thành công!',
      data: result
    });

  } catch (error) {
    console.error('Lỗi tại handleCreateCategory Controller:', error.message);
    
    // Phân tách loại lỗi (Bad Request vs Server Error)
    const isClientError = error.message.includes('bắt buộc') || error.message.includes('đã tồn tại');
    
    return res.status(isClientError ? 400 : 500).json({
      status: isClientError ? 400 : 500,
      message: error.message || 'Internal Server Error!'
    });
  }
};
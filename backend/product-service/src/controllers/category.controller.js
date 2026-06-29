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

// cập nhật category
export const handleUpdateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params; 
    const { name, description, status } = req.body;

    // Gọi service xử lý
    const result = await categoryService.updateCategory(categoryId, { name, description, status });

    return res.status(200).json({
      status: 200,
      message: 'Cập nhật danh mục thành công!',
      data: result
    });

  } catch (error) {
    console.error('Lỗi tại handleUpdateCategory Controller:', error.message);

    const isClientError = error.message.includes('trống') || error.message.includes('đã được sử dụng') || error.message.includes('Không tìm thấy');

    return res.status(isClientError ? 400 : 500).json({
      status: isClientError ? 400 : 500,
      message: error.message || 'Internal Server Error!'
    });
  }
};
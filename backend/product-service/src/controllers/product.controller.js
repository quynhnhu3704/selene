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

// lấy chi tiết sản phảm
export const handleGetProductDetail = async (req, res) => {
  try {
    const { id } = req.params; // Lấy product_id từ url: /api/products/product-detail/:id

    const productDetail = await productService.getProductDetail(id);

    return res.status(200).json({
      status: 200,
      message: 'Lấy chi tiết sản phẩm thành công!',
      data: productDetail
    });
  } catch (error) {
    return res.status(404).json({
      status: 404,
      message: error.message || 'Không tìm thấy thông tin sản phẩm!'
    });
  }
};

// tìm sp theo tên
export const handleSearchProductsByName = async (req, res) => {
  try {
    const { keyword, page, limit } = req.query; 

    const result = await productService.searchProductsByName({
      keyword: keyword,
      page,
      limit
    });

    return res.status(200).json({
      status: 200,
      message: 'Tìm kiếm danh sách sản phẩm thành công!',
      data: result.products,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Lỗi tại handleSearchProducts Controller:', error.message);
    return res.status(500).json({
      status: 500,
      message: error.message || 'Internal Server Error!'
    });
  }
};

// tìm sp theo danh mục
export const handleSearchProductsByCategory = async (req, res) => {
  try {
    const { category, page, limit } = req.query; 

    const result = await productService.searchProductsByCategoryName({
      categoryName: category, 
      limit
    });

    return res.status(200).json({
      status: 200,
      message: category ? 'Lấy danh sách sản phẩm theo danh mục thành công!' : 'Lấy tất cả danh sách sản phẩm thành công!',
      data: result.products,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Lỗi tại handleSearchProductsByCategory Controller:', error.message);
    return res.status(500).json({
      status: 500,
      message: error.message || 'Internal Server Error!'
    });
  }
};
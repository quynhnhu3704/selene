// backend\product-service\src\controllers\category.controller.js
import * as productService from "../services/product.service.js";

// lấy tất cả sản phẩm cho customer
export const handleGetAllProducts = async (req, res) => {
  try {
    const { page, limit } = req.query;

    // Gọi xuống service để truy vấn dữ liệu từ Supabase
    const result = await productService.getAllProduct({ page, limit });

    // Trả về dữ liệu kèm cấu trúc JSON chuẩn của hệ thống
    return res.status(200).json({
      status: 200,
      message: "Lấy danh sách sản phẩm thành công!",
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Lỗi tại handleGetAllProducts Controller:", error.message);
    return res.status(500).json({
      status: 500,
      message: error.message || "Internal Server Error!",
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
      message: "Lấy chi tiết sản phẩm thành công!",
      data: productDetail,
    });
  } catch (error) {
    return res.status(404).json({
      status: 404,
      message: error.message || "Không tìm thấy thông tin sản phẩm!",
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
      limit,
    });

    return res.status(200).json({
      status: 200,
      message: "Tìm kiếm danh sách sản phẩm thành công!",
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Lỗi tại handleSearchProducts Controller:", error.message);
    return res.status(500).json({
      status: 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

// tìm sp theo danh mục
export const handleSearchProductsByCategory = async (req, res) => {
  try {
    const { category, page, limit } = req.query;

    const result = await productService.searchProductsByCategoryName({
      categoryName: category,
      limit,
    });

    return res.status(200).json({
      status: 200,
      message: category
        ? "Lấy danh sách sản phẩm theo danh mục thành công!"
        : "Lấy tất cả danh sách sản phẩm thành công!",
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error(
      "Lỗi tại handleSearchProductsByCategory Controller:",
      error.message,
    );
    return res.status(500).json({
      status: 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

// thêm sp
export const handleCreateProduct = async (req, res) => {
  try {
    // req.body chứa các thông tin chữ, req.files chứa mảng các file ảnh từ Multer
    const result = await productService.createProductWithVariants(
      req.body,
      req.files,
    );

    return res.status(201).json({
      status: 201,
      message: "Thêm mới sản phẩm thành công!",
      data: result,
    });
  } catch (error) {
    console.error("Lỗi tại handleCreateProduct Controller:", error.message);

    const isClientError =
      error.message.includes("bắt buộc") ||
      error.message.includes("đã tồn tại") ||
      error.message.includes("ít nhất một biến thể");

    return res.status(isClientError ? 400 : 500).json({
      status: isClientError ? 400 : 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

// cập nhât sp
export const handleUpdateProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await productService.updateProductWithVariants(
      productId,
      req.body,
      req.files,
    );

    return res.status(200).json({
      status: 200,
      message: "Cập nhật sản phẩm thành công!",
      data: result,
    });
  } catch (error) {
    console.error("Lỗi tại handleUpdateProduct Controller:", error.message);

    const isClientError =
      error.message.includes("bắt buộc") ||
      error.message.includes("không tồn tại") ||
      error.message.includes("ít nhất một");

    return res.status(isClientError ? 400 : 500).json({
      status: isClientError ? 400 : 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

// lấy tất cả sản phẩm cho admin
export const handleGetAllProductsForAdmin = async (req, res) => {
  try {
    const { q, category, price, status, page, limit } = req.query;

    const result = await productService.getAllProductsAdmin({
      q,
      category,
      price,
      status,
      page,
      limit,
    });

    return res.status(200).json({
      status: 200,
      message: "Lấy danh sách sản phẩm quản trị thành công!",
      data: result,
    });
  } catch (error) {
    console.error(
      "Lỗi tại handleGetAllProductsForAdmin Controller:",
      error.message,
    );
    const isClientError = error.message.includes("không hợp lệ");

    return res.status(isClientError ? 400 : 500).json({
      status: isClientError ? 400 : 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

// khóa hoặc mở khóa sản phẩm
export const handleUpdateProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const { status } = req.body;

    const result = await productService.updateProductStatus(productId, status);

    return res.status(200).json({
      status: 200,
      message:
        status === "active"
          ? "Mở khóa sản phẩm thành công!"
          : "Khóa sản phẩm thành công!",
      data: result,
    });
  } catch (error) {
    console.error(
      "Lỗi tại handleUpdateProductStatus Controller:",
      error.message,
    );

    if (error.message.includes("Không tìm thấy")) {
      return res.status(404).json({
        status: 404,
        message: error.message,
      });
    }

    const isClientError =
      error.message.includes("không hợp lệ") ||
      error.message.includes("không được để trống");

    return res.status(isClientError ? 400 : 500).json({
      status: isClientError ? 400 : 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

// / Lấy chi tiết 1 sản phẩm kèm toàn bộ biến thể của nó
export const handleGetProductDetailForAdmin = async (req, res) => {
  try {
    const { productId } = req.params;

    const productDetail =
      await productService.getProductDetailForAdmin(productId);

    return res.status(200).json({
      status: 200,
      message: "Lấy chi tiết thông tin sản phẩm thành công!",
      data: productDetail,
    });
  } catch (error) {
    console.error("Lỗi tại handleGetProductDetail Controller:", error.message);

    // Nếu lỗi do không tìm thấy sản phẩm, trả về mã 404
    if (error.message.includes("Không tìm thấy")) {
      return res.status(404).json({
        status: 404,
        message: error.message,
      });
    }

    return res.status(500).json({
      status: 500,
      message: error.message || "Internal Server Error!",
    });
  }
};

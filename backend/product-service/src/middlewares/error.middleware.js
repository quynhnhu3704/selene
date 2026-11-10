// backend\product-service\src\middlewares\error.middleware.js
export const errorHandler = (err, req, res, next) => {
  if (err.name === "MulterError") {
    const messages = {
      LIMIT_FILE_SIZE: "Mỗi ảnh tối đa 5 MB",
      LIMIT_UNEXPECTED_FILE: "Chỉ được tải tối đa 10 ảnh qua trường images",
      LIMIT_FILE_COUNT: "Sản phẩm được có tối đa 10 ảnh",
    };
    return res.status(400).json({ status: 400, message: messages[err.code] || "Dữ liệu tải lên không hợp lệ" });
  }
  console.error("Product Service Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

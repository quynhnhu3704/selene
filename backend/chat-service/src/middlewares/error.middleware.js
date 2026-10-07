export const errorHandler = (err, req, res, next) => {
  console.error("Chat Service Error:", err);

  // Xử lý các lỗi từ Multer upload
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: 400,
        message: "Kích thước tệp đính kèm vượt quá giới hạn tối đa 50MB!",
      });
    }
    return res.status(400).json({
      status: 400,
      message: `Lỗi tải tệp tin: ${err.message}`,
    });
  }

  res.status(err.status || 500).json({
    status: err.status || 500,
    message: err.message || "Không thể xử lý yêu cầu hỗ trợ. Vui lòng thử lại!",
    details: err.details || err.hint || null,
  });
};

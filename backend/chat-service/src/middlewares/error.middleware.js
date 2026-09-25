export const errorHandler = (err, req, res, next) => {
  console.error("Chat Service Error:", err);
  res.status(err.status || 500).json({
    status: err.status || 500,
    message: err.message || "Không thể xử lý yêu cầu hỗ trợ. Vui lòng thử lại!",
    details: err.details || err.hint || null,
  });
};

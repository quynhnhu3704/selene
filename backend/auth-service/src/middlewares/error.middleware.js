// backend\auth-service\src\middlewares\error.middleware.js
export const errorHandler = (err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ status: 400, message: "Ảnh đại diện không được vượt quá 5 MB." });
  }
  console.error("Auth Service Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

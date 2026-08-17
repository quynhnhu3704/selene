// backend\product-service\src\middlewares\error.middleware.js
export const errorHandler = (err, req, res, next) => {
  console.error("Order Service Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

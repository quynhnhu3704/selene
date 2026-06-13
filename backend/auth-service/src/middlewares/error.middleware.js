export const errorHandler = (err, req, res, next) => {
  console.error('Auth Service Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
};



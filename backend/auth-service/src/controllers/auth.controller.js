import * as authService from '../services/auth.service.js';

// Xử lý đăng ký
export const handleRegister = async (req, res) => {
  try {
    const { email, phone, password, full_name } = req.body;
    
    // Lỗi thiếu tham số truyền vào đầu vào (Client Error -> 400)
    if (!email || !phone || !password || !full_name) {
      return res.status(400).json({
        status: 400,
        message: 'Vui lòng cung cấp đầy đủ thông tin đăng ký!'
      });
    }

    const result = await authService.registerUser({ email, phone, password, full_name });
    
    // Đăng ký thành công (Created -> 201)
    return res.status(201).json({
      status: 201,
      message: result.message
    });

  } catch (error) {
    // Nếu lỗi do trùng lặp tài khoản (lỗi nghiệp vụ do người dùng nhập sai -> 400)
    if (error.message.includes('đã được đăng ký') || error.message.includes('chưa cấu hình')) {
      return res.status(400).json({
        status: 400,
        message: error.message
      });
    }

    // Nếu là các lỗi hệ thống không lường trước (Lỗi kết nối mạng, lỗi sập DB Supabase -> Server Error 500)
    return res.status(500).json({
      status: 500,
      message: 'Internal Server Error!'
    });
  }
};


// Xử lý đăng nhập
export const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Lỗi thiếu dữ liệu đầu vào (400)
    if (!email || !password) {
      return res.status(400).json({
        status: 400,
        message: 'Vui lòng cung cấp cả Email và Mật khẩu!'
      });
    }

    const result = await authService.loginUser(email, password);
    
    // Đăng nhập thành công (OK -> 200)
    return res.status(200).json({
      status: 200,
      message: result.message,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user
    });

  } catch (error) {
    // Sai mật khẩu, sai email, tài khoản bị khóa -> Quyền truy cập không hợp lệ (Unauthorized -> 401)
    if (
      error.message.includes('không chính xác') || 
      error.message.includes('bị khóa hoặc chưa kích hoạt')
    ) {
      return res.status(401).json({
        status: 401,
        message: error.message
      });
    }

    // Các lỗi phát sinh bất ngờ khác từ server (500)
    return res.status(500).json({
      status: 500,
      message: 'Internal Server Error!'
    });
  }
};
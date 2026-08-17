// backend\auth-service\src\controllers\auth.controller.js
import * as authService from "../services/auth.service.js";

// Cấu hình Cookie
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // Phải là true khi sameSite: 'none'
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày tính bằng ms
};

// Xử lý đăng ký
export const handleRegister = async (req, res) => {
  try {
    const { email, phone, password, full_name } = req.body;

    // Lỗi thiếu tham số truyền vào đầu vào (Client Error -> 400)
    if (!email || !phone || !password || !full_name) {
      return res.status(400).json({
        status: 400,
        message: "Vui lòng cung cấp đầy đủ thông tin đăng ký!",
      });
    }

    const result = await authService.registerUser({
      email,
      phone,
      password,
      full_name,
    });

    // Đăng ký thành công (Created -> 201)
    return res.status(201).json({
      status: 201,
      message: result.message,
    });
  } catch (error) {
    // Nếu lỗi do trùng lặp tài khoản (lỗi nghiệp vụ do người dùng nhập sai -> 400)
    if (
      error.message.includes("đã được đăng ký") ||
      error.message.includes("chưa cấu hình")
    ) {
      return res.status(400).json({
        status: 400,
        message: error.message,
      });
    }

    // Nếu là các lỗi hệ thống không lường trước (Lỗi kết nối mạng, lỗi sập DB Supabase -> Server Error 500)
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
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
        message: "Vui lòng cung cấp cả Email và Mật khẩu!",
      });
    }

    const result = await authService.loginUser(email, password);

    //  Đính kèm Refresh Token vào Cookie
    res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);

    // Đăng nhập thành công (OK -> 200)
    return res.status(200).json({
      status: 200,
      message: result.message,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    // Sai mật khẩu, sai email, tài khoản bị khóa -> Quyền truy cập không hợp lệ (Unauthorized -> 401)
    if (
      error.message.includes("không chính xác") ||
      error.message.includes("bị khóa hoặc chưa kích hoạt")
    ) {
      return res.status(401).json({
        status: 401,
        message: error.message,
      });
    }

    // Các lỗi phát sinh bất ngờ khác từ server (500)
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
    });
  }
};

// Quên mật khẩu
export const handleForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Kiểm tra thô xem người dùng có truyền trống dữ liệu lên không
    if (!email) {
      return res.status(400).json({
        status: 400,
        message: "Lỗi! Bạn chưa nhập địa chỉ email cần khôi phục!",
      });
    }

    // Chuyển email sang tầng Service xử lý logic
    const result = await authService.forgotPasswordService(email);

    // Trả về phản hồi thành công cho Client (Frontend hoặc Postman)
    return res.status(200).json({
      status: 200,
      message: result.message,
    });
  } catch (error) {
    return res.status(400).json({
      status: 400,
      message:
        error.message || "Xảy ra lỗi trong quá trình xử lý khôi phục mật khẩu!",
    });
  }
};

export const handleLoginWithGoogle = async (req, res) => {
  try {
    // Google trả mã về qua Query parameters trên URL: ?code=4/0Af...
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        status: 400,
        message: "Không tìm thấy mã authorization code từ Google gửi về!",
      });
    }

    // Gửi mã xuống service để đổi lấy thông tin và xử lý DB
    const result = await authService.loginWithGoogle(code);

    // -Đính kèm vào cookie trước khi redirect
    res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);

    // ── BIẾN ĐỔI USER OBJECT THÀNH CHUỖI ĐỂ TRUYỀN QUA URL ──
    const userString = encodeURIComponent(JSON.stringify(result.user));

    // LƯU Ý KHI LÀM THỰC TẾ:
    // Vì Google chuyển hướng toàn bộ trang web sang API này, bạn nên trả về đoạn mã script
    // để bắn Token về Frontend hoặc chuyển hướng trình duyệt kèm Token qua query parameters.
    // Dưới đây là cách chuyển hướng đưa token về Frontend (Vite cổng 5173):
    return res.redirect(
      `http://localhost:5173/auth/success?accessToken=${result.accessToken}&user=${userString}`,
    );

    // const redirectUrl = `http://localhost:5173/tai-khoan/dang-nhap?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}&user=${userString}`;

    // // 3. IN CONSOLE NGAY TẠI ĐÂY (TRƯỚC LỆNH RETURN) ĐỂ KIỂM TRA
    // console.log("==================================================");
    // console.log("[BE LOG] CHUẨN BỊ TRẢ REDIRECT VỀ FRONTEND:");
    // console.log("URL chuyển hướng hoàn chỉnh:", redirectUrl);
    // console.log("==================================================");

    // // 4. Thực hiện lệnh return điều hướng thực tế
    // return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Lỗi Controller Google Callback:", error.message);
    return res.redirect(
      `http://localhost:5173/tai-khoan/dang-nhap?error=${encodeURIComponent(error.message)}`,
    );
  }
};

// lấy lại accessToken
export const handleRefreshToken = async (req, res) => {
  try {
    //Lấy token từ cookies thay vì req.body
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        status: 400,
        message: "Không tìm thấy mã Refresh Token trong yêu cầu!",
      });
    }

    // Gọi xuống service để xử lý
    const result = await authService.refreshAccessToken(refreshToken);

    return res.status(200).json({
      status: 200,
      message: "Cấp lại mã Access Token thành công!",
      accessToken: result.accessToken,
    });
  } catch (error) {
    return res.status(401).json({
      status: 401,
      message: error.message,
    });
  }
};

// đăng xuất
export const handleLogout = async (req, res) => {
  try {
    // 1. Lấy Refresh Token từ Cookie gửi lên
    const refreshToken = req.cookies.refreshToken;

    // 2. Gọi Service để xóa token dưới Database (nếu có token)
    if (refreshToken) {
      await authService.logoutUser(refreshToken);
    }

    // 3. Xóa sạch Cookie ở phía Trình duyệt Client
    res.clearCookie("refreshToken", {
      ...COOKIE_OPTIONS,
      maxAge: 0, // Đặt thời gian sống về 0 để xóa ngay lập tức
    });

    // 4. Trả kết quả về cho Frontend
    return res.status(200).json({
      status: 200,
      message: "Đăng xuất thành công!",
    });
  } catch (error) {
    console.error("Lỗi Controller Logout:", error.message);
    return res.status(500).json({
      status: 500,
      message: "Đã có lỗi xảy ra trong quá trình đăng xuất!",
    });
  }
};

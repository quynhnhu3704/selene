import * as userService from '../services/user.service.js';

// ================== CUSTOMER =====================

// cập nhật hồ sơ thông tin khách hàng
export const handleUpdateCustomerProfile = async (req, res) => {
  try {
    const accountId = req.user?.accountId; 

    if (!accountId) {
      return res.status(400).json({
        status: 400,
        message: 'Dữ liệu xác thực tài khoản bên trong mã Token không hợp lệ!'
      });
    }

    const { full_name, phone_number, gender, dob } = req.body;
    const avatarFile = req.file;

    const result = await userService.updateCustomerProfile(
      accountId,
      { full_name, phone_number, gender, dob },
      avatarFile
    );

    return res.status(200).json({
      status: 200,
      message: result.message,
      profile: result.profile
    });

  } catch (error) {
    if (
      error.message.includes('Không tìm thấy') || 
      error.message.includes('Thông tin mới') ||
      error.message.includes('tải ảnh đại diện')
    ) {
      return res.status(400).json({
        status: 400,
        message: error.message
      });
    }

    console.error('Lỗi Controller Cập nhật Profile:', error.stack);
    return res.status(500).json({
      status: 500,
      message: 'Internal Server Error!'
    });
  }
};

// ================== ADMIN =====================

// thêm nhân viên
export const handleCreateStaff = async (req, res) => {
  try {
    const { 
      email, phone, full_name, identity_card, 
      avatar_url, gender, dob, address 
    } = req.body;

    // Các thông tin bắt buộc tối thiểu để khởi tạo tài khoản nhân viên
    if (!email || !phone || !full_name ) {
      return res.status(400).json({
        status: 400,
        message: 'Vui lòng cung cấp đầy đủ thông tin bắt buộc (Email và Số điện thoại)!'
      });
    }

    // Gọi service xử lý logic lưu DB
    const result = await userService.createStaff({
      email, phone, full_name, identity_card, 
      avatar_url, gender, dob, address
    });

    return res.status(201).json({
      status: 201,
      message: 'Thêm mới nhân viên và khởi tạo tài khoản thành công!',
      note: 'Mật khẩu mặc định đăng nhập của nhân viên này là Số điện thoại.',
      data: result
    });

  } catch (error) {
    if (
      error.message.includes('đã được sử dụng') || 
      error.message.includes('đã tồn tại') ||
      error.message.includes('chưa cấu hình')
    ) {
      return res.status(400).json({
        status: 400,
        message: error.message
      });
    }

    console.error('Lỗi Controller Thêm Nhân Viên:', error.stack);
    return res.status(500).json({
      status: 500,
      message: 'Internal Server Error!'
    });
  }
};
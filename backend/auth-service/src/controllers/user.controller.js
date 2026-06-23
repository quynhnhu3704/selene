import * as userService from '../services/user.service.js';

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
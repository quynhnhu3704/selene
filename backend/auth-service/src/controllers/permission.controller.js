import * as permissionService from '../services/permission.service.js';


// lấy tất cả các quyền hiện có
export const handleGetAllPermissions = async (req, res) => {
  try {
    const result = await permissionService.getAllSystemPermissions();

    // Thành công (OK -> 200)
    return res.status(200).json({
      status: 200,
      message: 'Lấy danh sách tất cả các quyền thành công!',
      data: result
    });

  } catch (error) {
    // Lỗi hệ thống không lường trước
    return res.status(500).json({
      status: 500,
      message: 'Internal Server Error!'
    });
  }
};

// lấy các quyển theo accountId
export const handleGetPermissionsByAccountId = async (req, res) => {
  try {
    const { accountId } = req.params; 

    if (!accountId) {
      return res.status(400).json({
        status: 400,
        message: 'Vui lòng cung cấp mã tài khoản (accountId)!'
      });
    }

    const result = await permissionService.getPermissionsByAccountId(accountId);

    return res.status(200).json({
      status: 200,
      message: 'Lấy danh sách quyền thành công!',
      data: result
    });

  } catch (error) {
    if (error.message.includes('không tồn tại')) {
      return res.status(404).json({
        status: 404,
        message: error.message
      });
    }

    return res.status(500).json({
      status: 500,
      message: 'Internal Server Error!'
    });
  }
};
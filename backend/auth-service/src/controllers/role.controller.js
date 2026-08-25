// backend/auth-service/src/controllers/role.controller.js
import * as roleService from "../services/role.service.js";

// Cập nhật trạng thái của vai trò (Toggle active <-> inactive)
export const handleToggleRoleStatus = async (req, res) => {
  try {
    const { roleId } = req.params;

    if (!roleId) {
      return res.status(400).json({
        status: 400,
        message: "Vui lòng cung cấp mã vai trò (roleId)!",
      });
    }

    const result = await roleService.toggleRoleStatus(roleId);

    return res.status(200).json({
      status: 200,
      message: `Cập nhật trạng thái vai trò thành công! Trạng thái hiện tại: ${result.status}`,
      data: result,
    });
  } catch (error) {
    // Trả về lỗi nghiệp vụ (ví dụ: 404 không tìm thấy vai trò)
    if (error.status) {
      return res.status(error.status).json({
        status: error.status,
        message: error.message,
      });
    }

    // Lỗi hệ thống không lường trước
    console.error("Error at handleToggleRoleStatus: ", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
    });
  }
};

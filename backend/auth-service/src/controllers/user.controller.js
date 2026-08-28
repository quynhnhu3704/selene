// backend\auth-service\src\controllers\user.controller.js
import * as userService from "../services/user.service.js";

// ================== CUSTOMER =====================

// cập nhật hồ sơ thông tin khách hàng
export const handleUpdateCustomerProfile = async (req, res) => {
  try {
    const accountId = req.user?.accountId;

    if (!accountId) {
      return res.status(400).json({
        status: 400,
        message: "Dữ liệu xác thực tài khoản bên trong mã Token không hợp lệ!",
      });
    }

    const { full_name, phone_number, gender, dob } = req.body;
    const avatarFile = req.file;

    const result = await userService.updateCustomerProfile(
      accountId,
      { full_name, phone_number, gender, dob },
      avatarFile,
    );

    return res.status(200).json({
      status: 200,
      message: result.message,
      profile: result.profile,
    });
  } catch (error) {
    if (
      error.message.includes("Không tìm thấy") ||
      error.message.includes("Thông tin mới") ||
      error.message.includes("tải ảnh đại diện")
    ) {
      return res.status(400).json({
        status: 400,
        message: error.message,
      });
    }

    console.error("Lỗi Controller Cập nhật Profile:", error.stack);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
    });
  }
};

// lấy thông tin khách hàng
export const handleGetCustomerProfile = async (req, res) => {
  try {
    const accountId = req.user?.accountId; // Lấy từ token đã verify giống hàm update

    if (!accountId) {
      return res.status(400).json({
        status: 400,
        message: "Dữ liệu xác thực tài khoản bên trong mã Token không hợp lệ!",
      });
    }

    // Gọi đến service vừa tạo ở Bước 1
    const result = await userService.getCustomerProfile(accountId);

    return res.status(200).json({
      status: 200,
      message: result.message,
      profile: result.profile,
    });
  } catch (error) {
    // Xử lý lỗi nghiệp vụ nếu không tìm thấy profile
    if (error.message.includes("Không tìm thấy")) {
      return res.status(404).json({
        status: 404,
        message: error.message,
      });
    }

    console.error("Lỗi Controller Lấy Profile Khách hàng:", error.stack);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
    });
  }
};

// ================== STAFF =====================

// lấy thông tin nhân viên
export const handleGetStaffProfile = async (req, res) => {
  try {
    const accountId = req.user?.accountId;

    if (!accountId) {
      return res.status(400).json({
        status: 400,
        message: "Dữ liệu xác thực tài khoản bên trong mã Token không hợp lệ!",
      });
    }

    const result = await userService.getStaffProfile(accountId);

    return res.status(200).json({
      status: 200,
      message: result.message,
      profile: result.profile,
    });
  } catch (error) {
    if (error.message.includes("Không tìm thấy")) {
      return res.status(404).json({
        status: 404,
        message: error.message,
      });
    }

    console.error("Lỗi Controller Lấy Profile Nhân viên:", error.stack);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
    });
  }
};

export const handleUpdateStaffProfile = async (req, res) => {
  try {
    const accountId = req.user?.accountId;

    if (!accountId) {
      return res.status(400).json({
        status: 400,
        message: "Dữ liệu xác thực tài khoản bên trong mã Token không hợp lệ!",
      });
    }

    const {
      full_name,
      email,
      phone_number,
      identity_card,
      gender,
      dob,
      address,
    } = req.body;
    const avatarFile = req.file;

    const result = await userService.updateStaffProfile(
      accountId,
      { full_name, email, phone_number, identity_card, gender, dob, address },
      avatarFile,
    );

    return res.status(200).json({
      status: 200,
      message: result.message,
      profile: result.profile,
    });
  } catch (error) {
    if (
      error.message.includes("Không tìm thấy") ||
      error.message.includes("đã tồn tại") ||
      error.message.includes("đã được sử dụng") ||
      error.message.includes("tải ảnh đại diện")
    ) {
      return res.status(400).json({
        status: 400,
        message: error.message,
      });
    }

    console.error("Lỗi Controller Cập nhật Profile Staff:", error.stack);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
    });
  }
};

// ================== ADMIN =====================

// thêm nhân viên
export const handleCreateStaff = async (req, res) => {
  try {
    const {
      email,
      phone,
      full_name,
      identity_card,
      avatar_url,
      gender,
      dob,
      address,
    } = req.body;
    const avatarFile = req.file;

    // Các thông tin bắt buộc tối thiểu để khởi tạo tài khoản nhân viên
    if (!email || !phone || !full_name) {
      return res.status(400).json({
        status: 400,
        message:
          "Vui lòng cung cấp đầy đủ thông tin bắt buộc (Email và Số điện thoại)!",
      });
    }

    // Gọi service xử lý logic lưu DB
    const result = await userService.createStaff(
      { email, phone, full_name, identity_card, gender, dob, address },
      avatarFile,
    );

    return res.status(201).json({
      status: 201,
      message: "Thêm mới nhân viên và khởi tạo tài khoản thành công!",
      note: "Mật khẩu mặc định đăng nhập của nhân viên này là Số điện thoại.",
      data: result,
    });
  } catch (error) {
    if (
      error.message.includes("đã được sử dụng") ||
      error.message.includes("đã tồn tại") ||
      error.message.includes("chưa cấu hình")
    ) {
      return res.status(400).json({
        status: 400,
        message: error.message,
      });
    }

    console.error("Lỗi Controller Thêm Nhân Viên:", error.stack);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
    });
  }
};

// lấy danh sách hồ sơ người dùng
export const handleGetProfileList = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    if (page < 1 || limit < 1) {
      return res.status(400).json({
        status: 400,
        message: "Tham số phân trang page hoặc limit không hợp lệ!",
      });
    }

    const result = await userService.getProfileList(page, limit);

    return res.status(200).json({
      status: 200,
      message: "Lấy danh sách hồ sơ thành công!",
      data: result.profiles,
      pagination: {
        currentPage: page,
        limit: limit,
        totalItems: result.totalItems,
      },
    });
  } catch (error) {
    console.error("Lỗi Controller Lấy Danh Sách Profile:", error.stack);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
    });
  }
};

// lấy thông tin chi tiết hồ sơ
export const handleGetProfileDetail = async (req, res) => {
  try {
    const { profileId } = req.params;

    if (!profileId) {
      return res.status(400).json({
        status: 400,
        message: "Vui lòng cung cấp mã hồ sơ (profileId) cần xem!",
      });
    }

    const result = await userService.getProfileDetail(profileId);

    return res.status(200).json({
      status: 200,
      message: "Lấy thông tin chi tiết hồ sơ thành công!",
      data: result,
    });
  } catch (error) {
    if (error.message.includes("Không tìm thấy")) {
      return res.status(404).json({
        status: 404,
        message: error.message,
      });
    }

    console.error("Lỗi Controller Lấy Chi Tiết Profile:", error.stack);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
    });
  }
};

// cập nhật thông tin đồng bộ 2 bảng
export const handleUpdateProfileAll = async (req, res) => {
  try {
    const { accountId } = req.params;
    const {
      full_name,
      phone,
      email,
      identity_card,
      gender,
      dob,
      address,
      status,
    } = req.body;
    const avatarFile = req.file;

    if (!accountId) {
      return res.status(400).json({
        status: 400,
        message: "Vui lòng cung cấp mã tài khoản (accountId) cần cập nhật!",
      });
    }

    // Gọi service xử lý logic nghiệp vụ
    const result = await userService.updateProfileAll(
      accountId,
      { full_name, phone, email, identity_card, gender, dob, address, status },
      avatarFile,
    );

    return res.status(200).json({
      status: 200,
      message: result.message,
      profile: result.profile,
    });
  } catch (error) {
    if (
      error.message.includes("Không tìm thấy") ||
      error.message.includes("đã được sử dụng") ||
      error.message.includes("đã tồn tại") ||
      error.message.includes("Storage")
    ) {
      return res.status(400).json({
        status: 400,
        message: error.message,
      });
    }

    console.error("Lỗi Controller Cập nhật Profile Tổng hợp:", error.stack);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
    });
  }
};

// cập nhật account
export const handleUpdateAccount = async (req, res) => {
  try {
    const { accountId } = req.params;

    if (!accountId) {
      return res.status(400).json({
        status: 400,
        message: "Vui lòng cung cấp ID tài khoản cần cập nhật!",
      });
    }

    // Nhận thêm email từ body
    const { email, password, phone, status } = req.body;

    // Truyền email vào Service xử lý
    const result = await userService.updateAccount(accountId, {
      email,
      password,
      phone,
      status,
    });

    return res.status(200).json({
      status: 200,
      message: "Admin cập nhật tài khoản thành công!",
      account: result.account,
      profile: result.profile,
    });
  } catch (error) {
    console.error("Lỗi Admin Cập nhật Tài khoản:", error.stack);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
    });
  }
};

// lấy danh sách account
export const handleGetAccounts = async (req, res) => {
  try {
    // Lấy page và limit từ query parameters, mặc định nếu không truyền là page=1, limit=10
    const { page = 1, limit = 10 } = req.query;

    const result = await userService.getAccountList(page, limit);

    return res.status(200).json({
      status: 200,
      message: "Lấy danh sách tài khoản thành công!",
      data: result.accounts,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Lỗi Controller Lấy Danh Sách Account:", error.stack);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
    });
  }
};

// thay đổi mật khẩu
export const handleChangePassword = async (req, res) => {
  try {
    const accountId = req.user?.accountId;

    if (!accountId) {
      return res.status(400).json({
        status: 400,
        message: "Dữ liệu xác thực tài khoản không hợp lệ!",
      });
    }

    const { oldPassword, newPassword } = req.body;

    // Gọi tầng service xử lý nghiệp vụ
    const result = await userService.changePassword(
      accountId,
      oldPassword,
      newPassword,
    );

    return res.status(200).json({
      status: 200,
      message: result.message,
    });
  } catch (error) {
    if (
      error.message.includes("Vui lòng cung cấp") ||
      error.message.includes("Mật khẩu cũ không chính xác") ||
      error.message.includes("Không tìm thấy tài khoản")
    ) {
      return res.status(400).json({
        status: 400,
        message: error.message,
      });
    }

    console.error("Lỗi Controller Đổi Mật Khẩu:", error.stack);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
    });
  }
};

// Đổi trạng thái hoạt động của tài khoản (Toggle active <-> inactive)
export const handleToggleAccountStatus = async (req, res) => {
  try {
    const { accountId } = req.params;

    if (!accountId) {
      return res.status(400).json({
        status: 400,
        message: "Vui lòng cung cấp ID tài khoản (accountId)!",
      });
    }

    const result = await userService.toggleAccountStatus(accountId);

    return res.status(200).json({
      status: 200,
      message: "Cập nhật trạng thái tài khoản thành công!",
      data: result,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        status: error.status,
        message: error.message,
      });
    }

    console.error("Lỗi Controller Đổi Trạng thái Tài khoản:", error.stack);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error!",
    });
  }
};

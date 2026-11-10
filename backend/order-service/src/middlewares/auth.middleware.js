// backend\order-service\src\middlewares\auth.middleware.js
import jwt from "jsonwebtoken";
import { resolveRemoteAccess } from "../../../shared/access.mjs";
import { config } from "../configs/index.js";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // TRƯỜNG HỢP 1: Không tìm thấy Token trong Header (Chưa đăng nhập)
  if (!token) {
    return res.status(401).json({
      status: 401,
      message:
        "Truy cập bị từ chối! Bạn chưa đăng nhập hoặc thiếu Access Token.",
    });
  }

  try {
    jwt.verify(token, config.jwtAccessSecret);
    const decoded = await resolveRemoteAccess(token);
    req.user = decoded;

    // Khu vực quản trị chỉ dành cho chủ cửa hàng và nhân viên.
    if (
      /^\/manage(?:\/|$)/i.test(req.path) &&
      (Number(decoded.role_id) === 3 ||
        !["admin", "staff"].includes(decoded.role))
    ) {
      return res.status(403).json({
        status: 403,
        message: "Bạn không có quyền truy cập khu vực quản trị!",
      });
    }

    next();
  } catch (error) {
    if (error.status) return res.status(error.status).json({ status: error.status, message: error.message });
    if (!["TokenExpiredError", "JsonWebTokenError", "NotBeforeError"].includes(error.name)) {
      return res.status(503).json({ status: 503, message: "Không thể xác minh quyền hiện tại. Vui lòng thử lại!" });
    }
    // TRƯỜNG HỢP 2: Token gửi lên bị lỗi (Hết hạn hoặc không hợp lệ)
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: 401,
        message: "Phiên đăng nhập của bạn đã hết hạn!",
      });
    }

    // Các lỗi khác của JWT như Token bị chỉnh sửa, sai chữ ký (Signature)...
    return res.status(403).json({
      status: 403,
      message: "Access Token không hợp lệ hoặc đã bị thay đổi trái phép!",
    });
  }
};

export const verifyPermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !Array.isArray(req.user.permissions)) {
      return res.status(403).json({
        status: 403,
        message: "Không thể xác thực quyền truy cập!",
      });
    }

    const permissionsToCheck = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    // Kiểm tra xem user có ít nhất 1 trong các quyền yêu cầu hay không
    const hasPermission = permissionsToCheck.some((permission) =>
      req.user.permissions.includes(permission),
    );

    if (!hasPermission) {
      return res.status(403).json({
        status: 403,
        message: "Bạn không có đủ quyền để thực hiện hành động này!",
      });
    }

    next();
  };
};

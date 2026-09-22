import * as dashboardService from "../services/dashboard.service.js";

export const handleGetDashboardStatistics = async (req, res) => {
  try {
    const statistics = await dashboardService.getDashboardStatistics(req.query);
    res.status(200).json({
      success: true,
      message: "Lấy thống kê dashboard thành công!",
      data: statistics,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.status === 400 ? error.message : "Không thể tải thống kê. Vui lòng thử lại!",
    });
  }
};

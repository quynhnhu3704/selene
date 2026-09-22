// backend/auth-service/src/services/export.service.js
import ExcelJS from "exceljs";
import { getAdminUsers } from "./user.service.js";

// Xuất danh sách người dùng theo bộ lọc hiện tại
export const generateUsersExcelBuffer = async (query, authorization) => {
  const { users } = await getAdminUsers(query, true, authorization);
  const { role } = query;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(
    role === "staff" ? "Nhân viên" : "Khách hàng",
  );
  const customer = role === "customer";
  sheet.addRow([
    "STT",
    "Họ tên",
    "Email",
    "Số điện thoại",
    ...(customer ? ["Đơn hàng"] : []),
    "Ngày sinh",
    "Ngày tham gia",
    "Trạng thái",
  ]);
  users.forEach((user, index) =>
    sheet.addRow([
      index + 1,
      user.full_name,
      user.email,
      user.phone_number,
      ...(customer ? [user.order_count] : []),
      user.dob,
      user.created_at,
      user.status === "active" ? "Hoạt động" : "Đã khóa",
    ]),
  );
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((column) => {
    column.width = 24;
  });

  return workbook.xlsx.writeBuffer();
};

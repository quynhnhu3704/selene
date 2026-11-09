// frontend/src/pages/Admin/Promotions/mockData.js

export const PRODUCT_PROMOTION_STATUSES = [
  { key: "active", label: "Đang hoạt động", color: "success" },
  { key: "inactive", label: "Dừng hoạt động", color: "danger" },
  { key: "paused", label: "Dừng hoạt động", color: "danger" },
  { key: "out_of_stock", label: "Đã sử dụng hết suất", color: "warning" },
  { key: "expired", label: "Đã hết thời gian", color: "secondary" },
  { key: "ended", label: "Đã hết thời gian", color: "secondary" },
  { key: "upcoming", label: "Sắp diễn ra", color: "info" },
];

export const PRODUCT_PROMOTION_FILTER_STATUSES = [
  { key: "active", label: "Đang hoạt động" },
  { key: "inactive", label: "Dừng hoạt động" },
  { key: "out_of_stock", label: "Đã sử dụng hết suất" },
  { key: "expired", label: "Đã hết thời gian" },
];

export const PRODUCT_SORT_OPTIONS = [
  { key: "default", label: "Mặc định" },
  { key: "newest", label: "Mới nhất" },
  { key: "oldest", label: "Cũ nhất" },
  { key: "usage_desc", label: "Lượt dùng: Nhiều → Ít" },
  { key: "az", label: "Tên: A → Z" },
];

export const ORDER_DISCOUNT_STATUSES = [
  { key: "active", label: "Đang hoạt động", color: "success" },
  { key: "inactive", label: "Dừng hoạt động", color: "danger" },
  { key: "out_of_stock", label: "Đã sử dụng hết suất", color: "warning" },
  { key: "expired", label: "Đã hết thời gian", color: "secondary" },
];

export const ORDER_SORT_OPTIONS = [
  { key: "default", label: "Mặc định" },
  { key: "newest", label: "Mới nhất" },
  { key: "oldest", label: "Cũ nhất" },
  { key: "discount_desc", label: "Giá trị giảm: Cao → Thấp" },
  { key: "usage_desc", label: "Lượt dùng: Nhiều → Ít" },
  { key: "az", label: "Mã: A → Z" },
];

export const INITIAL_PRODUCT_PROMOTIONS = [
  {
    id: "KM01",
    code: "KM1790052303446sp01",
    name: "Ưu đãi BST Mùa Hè Rực Rỡ",
    scope: "Toàn bộ sản phẩm",
    discount_type: "percent",
    discount_value: 30,
    status: "active",
    start_date: "2026-09-01",
    end_date: "2026-10-31",
    created_at: "2026-08-25",
  },
  {
    id: "KM02",
    code: "KM1790050543381sp02",
    name: "Giảm giá đặc biệt Áo Polo & Sơ mi",
    scope: "Danh mục Áo nam",
    discount_type: "percent",
    discount_value: 20,
    status: "active",
    start_date: "2026-09-15",
    end_date: "2026-10-25",
    created_at: "2026-09-10",
  },
  {
    id: "KM03",
    code: "KM1789298664317sp03",
    name: "Trợ giá Quần Jean cá tính Selene",
    scope: "Danh mục Quần Jean",
    discount_type: "fixed",
    discount_value: 50000,
    status: "active",
    start_date: "2026-09-10",
    end_date: "2026-10-20",
    created_at: "2026-09-05",
  },
  {
    id: "KM04",
    code: "KM1789295584573sp04",
    name: "Flash Sale Tết Trung Thu 2026",
    scope: "Sản phẩm chọn lọc (12 SP)",
    discount_type: "percent",
    discount_value: 25,
    status: "upcoming",
    start_date: "2026-10-01",
    end_date: "2026-10-07",
    created_at: "2026-09-18",
  },
  {
    id: "KM05",
    code: "KM1789295534894sp05",
    name: "Ra mắt BST Thu Đông 2026",
    scope: "Áo khoác & Hoodie",
    discount_type: "percent",
    discount_value: 15,
    status: "upcoming",
    start_date: "2026-10-15",
    end_date: "2026-11-15",
    created_at: "2026-09-20",
  },
  {
    id: "KM06",
    code: "KM1788872963823sp06",
    name: "Xả kho cuối tuần giảm sâu",
    scope: "Sản phẩm Outlet (8 SP)",
    discount_type: "percent",
    discount_value: 50,
    status: "paused",
    start_date: "2026-09-05",
    end_date: "2026-09-30",
    created_at: "2026-08-30",
  },
  {
    id: "KM07",
    code: "KM1788540192831sp07",
    name: "Combo 2 Áo thun Basic tiện dụng",
    scope: "Áo thun phong cách",
    discount_type: "fixed",
    discount_value: 40000,
    status: "active",
    start_date: "2026-09-20",
    end_date: "2026-10-20",
    created_at: "2026-09-12",
  },
  {
    id: "KM08",
    code: "KM1788102394829sp08",
    name: "Tựu trường phong cách cùng Selene",
    scope: "Balo & Phụ kiện",
    discount_type: "percent",
    discount_value: 20,
    status: "ended",
    start_date: "2026-08-15",
    end_date: "2026-09-05",
    created_at: "2026-08-01",
  },
  {
    id: "KM09",
    code: "KM1787948271638sp09",
    name: "Giảm giá phụ kiện thời trang nữ",
    scope: "Tất cả phụ kiện",
    discount_type: "fixed",
    discount_value: 20000,
    status: "ended",
    start_date: "2026-08-01",
    end_date: "2026-08-31",
    created_at: "2026-07-28",
  },
  {
    id: "KM10",
    code: "KM1787123984712sp10",
    name: "Đặc quyền BST Selene Limited",
    scope: "BST Limited Edition",
    discount_type: "percent",
    discount_value: 35,
    status: "active",
    start_date: "2026-09-22",
    end_date: "2026-11-01",
    created_at: "2026-09-21",
  },
];

export const INITIAL_ORDER_DISCOUNTS = [
  {
    voucher_id: "voucher-giam50k",
    id: "VC00",
    code: "GIAM50K",
    name: "Giảm 50k cho đơn từ 200k",
    discount_type: "percentage",
    discount_value: 20,
    min_order_value: 200000,
    min_order: 200000,
    max_discount_amount: 50000,
    total_quantity: 100,
    max_usage: 100,
    used_quantity: 0,
    used_count: 0,
    per_user_limit: 10,
    start_date: "2024-01-01T00:00:00Z",
    end_date: "2024-12-31T23:59:59Z",
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    voucher_id: "voucher-selene20k",
    id: "VC01",
    code: "SELENE20K",
    name: "Giảm 20.000đ đơn đầu tiên",
    discount_type: "fixed_amount",
    discount_value: 20000,
    min_order_value: 150000,
    min_order: 150000,
    max_discount_amount: 0,
    total_quantity: 200,
    max_usage: 200,
    used_quantity: 82,
    used_count: 82,
    per_user_limit: 1,
    status: "active",
    start_date: "2026-09-01",
    end_date: "2026-10-31",
    created_at: "2026-08-28",
  },
  {
    voucher_id: "voucher-freeshipmax",
    id: "VC02",
    code: "FREESHIPMAX",
    name: "Miễn phí vận chuyển toàn quốc",
    discount_type: "free_shipping",
    discount_value: 30000,
    min_order_value: 300000,
    min_order: 300000,
    max_discount_amount: 30000,
    total_quantity: 200,
    max_usage: 200,
    used_quantity: 145,
    used_count: 145,
    per_user_limit: 3,
    status: "active",
    start_date: "2026-09-10",
    end_date: "2026-10-31",
    created_at: "2026-09-02",
  },
  {
    voucher_id: "voucher-selene50k",
    id: "VC03",
    code: "SELENE50K",
    name: "Giảm 50.000đ cho đơn từ 500k",
    discount_type: "fixed_amount",
    discount_value: 50000,
    min_order_value: 500000,
    min_order: 500000,
    max_discount_amount: 0,
    total_quantity: 50,
    max_usage: 50,
    used_quantity: 50,
    used_count: 50,
    per_user_limit: 1,
    status: "out_of_stock",
    start_date: "2026-09-05",
    end_date: "2026-10-15",
    created_at: "2026-09-01",
  },
  {
    voucher_id: "voucher-vipmember",
    id: "VC04",
    code: "VIPMEMBER",
    name: "Đặc quyền tri ân hội viên thân thiết",
    discount_type: "percentage",
    discount_value: 15,
    min_order_value: 700000,
    min_order: 700000,
    max_discount_amount: 150000,
    total_quantity: 100,
    max_usage: 100,
    used_quantity: 28,
    used_count: 28,
    per_user_limit: 2,
    status: "active",
    start_date: "2026-09-15",
    end_date: "2026-11-15",
    created_at: "2026-09-10",
  },
  {
    voucher_id: "voucher-payday10",
    id: "VC05",
    code: "PAYDAY10",
    name: "Siêu sale Ngày Lương Về",
    discount_type: "percentage",
    discount_value: 10,
    min_order_value: 400000,
    min_order: 400000,
    max_discount_amount: 80000,
    total_quantity: 300,
    max_usage: 300,
    used_quantity: 0,
    used_count: 0,
    per_user_limit: 1,
    status: "inactive",
    start_date: "2026-10-05",
    end_date: "2026-10-10",
    created_at: "2026-09-20",
  },
];

export const getProductPromotionStatus = (status) => {
  if (status === "active")
    return { label: "Đang hoạt động", color: "success" };
  if (status === "inactive" || status === "paused")
    return { label: "Dừng hoạt động", color: "danger" };
  if (status === "out_of_stock" || status === "depleted")
    return { label: "Đã sử dụng hết suất", color: "warning" };
  if (status === "expired" || status === "ended")
    return { label: "Đã hết thời gian", color: "secondary" };
  if (status === "upcoming")
    return { label: "Sắp diễn ra", color: "info" };
  return (
    PRODUCT_PROMOTION_STATUSES.find((item) => item.key === status) || {
      label: status || "—",
      color: "secondary",
    }
  );
};

export const getOrderDiscountStatus = (status) => {
  if (status === "out_of_stock" || status === "depleted") {
    return { label: "Đã sử dụng hết suất", color: "warning" };
  }
  if (status === "inactive" || status === "locked") {
    return { label: "Dừng hoạt động", color: "danger" };
  }
  if (status === "expired") {
    return { label: "Đã hết thời gian", color: "secondary" };
  }
  if (status === "active") {
    return { label: "Đang hoạt động", color: "success" };
  }
  return (
    ORDER_DISCOUNT_STATUSES.find((item) => item.key === status) || {
      label: status || "—",
      color: "secondary",
    }
  );
};

export const fmtVND = (value) =>
  Number(value || 0).toLocaleString("vi-VN") + "đ";

export const formatDate = (value) => {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
};

export const downloadCSV = (filename, headers, rows) => {
  const csvContent =
    "\uFEFF" +
    [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((field) => {
            const str = String(field ?? "").replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(","),
      ),
    ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};


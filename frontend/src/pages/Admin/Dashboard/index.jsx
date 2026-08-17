// frontend\src\pages\Admin\Dashboard\index.jsx
import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ── DỮ LIỆU MẪU ── */
const revenueData = [
  { month: "T1", revenue: 12400000, orders: 48 },
  { month: "T2", revenue: 18200000, orders: 72 },
  { month: "T3", revenue: 15800000, orders: 61 },
  { month: "T4", revenue: 22500000, orders: 89 },
  { month: "T5", revenue: 19700000, orders: 77 },
  { month: "T6", revenue: 28300000, orders: 112 },
  { month: "T7", revenue: 31500000, orders: 125 },
];

const categoryData = [
  { name: "Áo", value: 38 },
  { name: "Quần", value: 24 },
  { name: "Váy/Đầm", value: 21 },
  { name: "Set đồ", value: 11 },
  { name: "Phụ kiện", value: 6 },
];

const recentOrders = [
  {
    id: "#ORD-1024",
    customer: "Nguyễn Thị Mai",
    total: "620.000đ",
    status: "Đang giao",
    time: "10 phút trước",
  },
  {
    id: "#ORD-1023",
    customer: "Trần Văn Bình",
    total: "1.240.000đ",
    status: "Đã giao",
    time: "32 phút trước",
  },
  {
    id: "#ORD-1022",
    customer: "Lê Hoàng Anh",
    total: "480.000đ",
    status: "Chờ xác nhận",
    time: "1 giờ trước",
  },
  {
    id: "#ORD-1021",
    customer: "Phạm Thị Lan",
    total: "850.000đ",
    status: "Đã giao",
    time: "2 giờ trước",
  },
  {
    id: "#ORD-1020",
    customer: "Võ Minh Khoa",
    total: "390.000đ",
    status: "Đã huỷ",
    time: "3 giờ trước",
  },
];

const STATUS_BADGE = {
  "Đang giao": "warning",
  "Đã giao": "success",
  "Chờ xác nhận": "secondary",
  "Đã huỷ": "danger",
};

const fmtVND = (v) => (v / 1000000).toFixed(1) + "M";

const STATS = [
  {
    label: "Doanh thu tháng",
    value: "31,5 triệu",
    sub: "+12% so với tháng trước",
    icon: "bi-graph-up-arrow",
    color: "#212529",
  },
  {
    label: "Đơn hàng",
    value: "125",
    sub: "+18 đơn so với tháng trước",
    icon: "bi-receipt",
    color: "#212529",
  },
  {
    label: "Sản phẩm",
    value: "284",
    sub: "12 sản phẩm mới tháng này",
    icon: "bi-box-seam",
    color: "#212529",
  },
  {
    label: "Người dùng",
    value: "1.842",
    sub: "+34 thành viên mới",
    icon: "bi-people",
    color: "#212529",
  },
];

/* Custom tooltip */
const RevenueTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
      <p style={{ color: "#212529", margin: 0 }}>
        Doanh thu:{" "}
        <strong>{(payload[0]?.value / 1000000).toFixed(1)}M đ</strong>
      </p>
      <p style={{ color: "#871B1B", margin: 0 }}>
        Đơn hàng: <strong>{payload[1]?.value}</strong>
      </p>
    </div>
  );
};

export default function Dashboard() {
  return (
    <>
      <style>{`
        .dash-stat-card {
          background: #fff; border-radius: 14px;
          padding: 22px 24px;
          border: 1px solid #f0f0f0;
          display: flex; align-items: center; gap: 18px;
          transition: box-shadow 0.2s;
        }
        .dash-stat-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .dash-stat-icon {
          width: 52px; height: 52px; border-radius: 14px;
          background: #212529;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; color: #fff; flex-shrink: 0;
        }
        .dash-stat-label { font-size: 12px; font-weight: 600; color: #adb5bd; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
        .dash-stat-val   { font-size: 24px; font-weight: 800; color: #212529; line-height: 1; margin-bottom: 4px; }
        .dash-stat-sub   { font-size: 12px; color: #6c757d; }

        .dash-chart-card {
          background: #fff; border-radius: 14px;
          padding: 22px 24px; border: 1px solid #f0f0f0;
        }
        .dash-chart-title { font-size: 14px; font-weight: 800; color: #212529; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 18px; }

        .dash-order-row { display: flex; align-items: center; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid #f8f8f8; }
        .dash-order-row:last-child { border-bottom: none; }
        .dash-order-id   { font-size: 13px; font-weight: 700; color: #212529; }
        .dash-order-name { font-size: 13px; color: #6c757d; }
        .dash-order-amt  { font-size: 13px; font-weight: 700; color: #212529; }
        .dash-order-time { font-size: 11px; color: #adb5bd; }
      `}</style>

      {/* ── STAT CARDS ── */}
      <div className="row g-3 mb-4">
        {STATS.map((s) => (
          <div className="col-6 col-xl-3" key={s.label}>
            <div className="dash-stat-card">
              <div className="dash-stat-icon">
                <i className={`bi ${s.icon}`} />
              </div>
              <div>
                <div className="dash-stat-label">{s.label}</div>
                <div className="dash-stat-val">{s.value}</div>
                <div className="dash-stat-sub">{s.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── CHARTS ROW ── */}
      <div className="row g-3 mb-4">
        {/* Doanh thu */}
        <div className="col-12 col-xl-8">
          <div className="dash-chart-card">
            <div className="dash-chart-title">Doanh thu & đơn hàng</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={revenueData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtVND}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#212529"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#212529" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#871B1B"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  yAxisId={0}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Danh mục */}
        <div className="col-12 col-xl-4">
          <div className="dash-chart-card h-100">
            <div className="dash-chart-title">Cơ cấu danh mục</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip formatter={(v) => [`${v}%`, "Tỷ lệ"]} />
                <Bar
                  dataKey="value"
                  fill="#212529"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── RECENT ORDERS ── */}
      <div className="dash-chart-card">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="dash-chart-title mb-0">Đơn hàng gần đây</div>
          <a
            href="/admin/don-hang"
            className="form-link-sm"
            style={{ fontSize: 13 }}
          >
            Xem tất cả →
          </a>
        </div>

        {recentOrders.map((o) => (
          <div className="dash-order-row" key={o.id}>
            <div>
              <div className="dash-order-id">{o.id}</div>
              <div className="dash-order-name">{o.customer}</div>
            </div>
            <span
              className={`badge bg-${STATUS_BADGE[o.status]} bg-opacity-10 text-${STATUS_BADGE[o.status]} fw-semibold`}
              style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8 }}
            >
              {o.status}
            </span>
            <div className="text-end">
              <div className="dash-order-amt">{o.total}</div>
              <div className="dash-order-time">{o.time}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

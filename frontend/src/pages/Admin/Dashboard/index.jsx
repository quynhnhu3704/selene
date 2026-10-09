// frontend/src/pages/Admin/Dashboard/index.jsx
import Loading from "../../../components/common/Loading";
import AdminSelect from "../components/AdminSelect";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Area,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardStatistics } from "../../../services/dashboard.service";
import { getOrderStatus, fmtVND, PAYMENT_METHODS } from "../Orders/constants";
import "./dashboard.css";

const COLORS = [
  "#871b1b",
  "#212529",
  "#b76e65",
  "#c5a173",
  "#6d8075",
  "#9a8d9e",
  "#d7b7af",
  "#82969e",
];
const STATUS_COLORS = {
  unpaid: "#c5a173",
  pending: "#9a8d9e",
  confirmed: "#82969e",
  processing: "#b76e65",
  shipping: "#b88748",
  delivered: "#6d8075",
  completed: "#871b1b",
  cancelled: "#212529",
};
const DAY = 86400000;
const number = (value) =>
  Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const compact = (value) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
const dateKey = (value) =>
  new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 10);
const shortDate = (value) => `${value.slice(8, 10)}/${value.slice(5, 7)}`;
const fullDate = (value) =>
  new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const getPeriod = (days) => ({
  start: dateKey(Date.now() - (days - 1) * DAY),
  end: dateKey(Date.now()),
});
const AXIS = {
  axisLine: false,
  tickLine: false,
  tick: { fill: "#85807c", fontSize: 11 },
  tickMargin: 10,
};
const STATS = [
  {
    key: "revenue",
    label: "Doanh thu ghi nhận",
    icon: "bi-wallet2",
    money: true,
    note: "Đã giao / hoàn thành và đã thanh toán",
  },
  {
    key: "orders",
    label: "Tổng đơn hàng",
    icon: "bi-bag-check",
    note: "Tất cả đơn được tạo trong kỳ",
  },
  {
    key: "units",
    label: "Sản phẩm đã bán",
    icon: "bi-box-seam",
    note: "Số lượng từ đơn ghi nhận doanh thu",
  },
  {
    key: "buyers",
    label: "Khách đã mua",
    icon: "bi-people",
    note: "Tài khoản có đơn ghi nhận doanh thu",
  },
  {
    key: "average",
    label: "Giá trị đơn trung bình",
    icon: "bi-receipt",
    money: true,
    note: "Doanh thu / số đơn ghi nhận",
  },
  {
    key: "completion",
    label: "Tỷ lệ giao thành công",
    icon: "bi-check2-circle",
    percent: true,
    note: "Đã giao + hoàn thành / tổng đơn",
  },
];

function ChartTooltip({ active, payload, label, money = false }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dash-tooltip">
      <strong>{label || payload[0]?.name}</strong>
      {payload.map((entry) => (
        <div key={entry.dataKey || entry.name}>
          <span>
            <i
              style={{
                background: entry.color || entry.payload?.fill || COLORS[0],
              }}
            />
            {entry.name}
          </span>
          <b>
            {money || ["revenue", "previousRevenue"].includes(entry.dataKey)
              ? fmtVND(entry.value)
              : number(entry.value)}
          </b>
        </div>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  children,
  action,
  className = "",
}) {
  return (
    <section className={`dash-chart-card ${className}`}>
      <div className="dash-card-head">
        <div className="dash-card-title">
          <span className="dash-card-icon">
            <i className={`bi ${icon}`} />
          </span>
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ text = "Chưa có dữ liệu trong khoảng thời gian này" }) {
  return (
    <div className="dash-empty">
      <i className="bi bi-bar-chart" />
      <strong>{text}</strong>
      <span>Thử chọn một khoảng thời gian khác để xem thống kê.</span>
    </div>
  );
}

function Change({ value, previous, percent }) {
  const difference = value - previous;
  const change = percent
    ? difference
    : previous
      ? (difference / previous) * 100
      : null;
  return (
    <span
      className={`dash-change ${difference > 0 ? "up" : difference < 0 ? "down" : "neutral"}`}
    >
      <i
        className={`bi ${difference > 0 ? "bi-arrow-up-right" : difference < 0 ? "bi-arrow-down-right" : "bi-dash"}`}
      />
      {change === null
        ? value
          ? "Phát sinh trong kỳ"
          : "Chưa phát sinh"
        : `${number(Math.abs(change))}${percent ? " điểm %" : "%"}`}
    </span>
  );
}

function SalesCalendar({ timeline }) {
  const [metric, setMetric] = useState("orders");
  const [selectedDate, setSelectedDate] = useState("");
  const months = [...new Set(timeline.map((point) => point.date.slice(0, 7)))];
  const maximum = Math.max(...timeline.map((point) => point[metric]), 0);
  const selected = timeline.find((point) => point.date === selectedDate);

  return (
    <ChartCard
      title="Lịch bán hàng"
      subtitle="Sắc đỏ đậm hơn, ngày bán tốt hơn"
      icon="bi-calendar3"
      className="dash-calendar-card"
      action={
        <div className="adm-tabs">
          {[
            ["orders", "Đơn hàng"],
            ["revenue", "Doanh thu"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`adm-tab-btn ${metric === key ? "active" : ""}`}
              aria-pressed={metric === key}
              onClick={() => setMetric(key)}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      <div
        className="dash-calendar-months"
        tabIndex={0}
        role="region"
        aria-label="Lịch bán hàng theo tháng"
      >
        {months.map((month) => {
          const points = timeline.filter((point) =>
            point.date.startsWith(month),
          );
          const offset =
            (new Date(`${points[0].date}T12:00:00+07:00`).getUTCDay() + 6) % 7;
          return (
            <div className="dash-calendar-month" key={month}>
              <h3>
                Tháng {Number(month.slice(5))}
                <span>{month.slice(0, 4)}</span>
              </h3>
              <div className="dash-calendar-grid">
                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
                {Array.from({ length: offset }, (_, index) => (
                  <span key={`blank-${index}`} />
                ))}
                {points.map((point) => {
                  const level = point[metric]
                    ? Math.max(1, Math.ceil((point[metric] / maximum) * 4))
                    : 0;
                  const label = `${fullDate(point.date)}: ${metric === "revenue" ? fmtVND(point.revenue) : `${number(point.orders)} đơn`}`;
                  return (
                    <button
                      key={point.date}
                      className={`dash-calendar-day level-${level} ${selectedDate === point.date ? "selected" : ""}`}
                      title={label}
                      aria-label={label}
                      aria-pressed={selectedDate === point.date}
                      onClick={() => setSelectedDate(point.date)}
                    >
                      {Number(point.date.slice(8))}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="dash-calendar-footer">
        <div aria-live="polite">
          {selected ? (
            <>
              <strong>{shortDate(selected.date)}</strong>
              <span>{number(selected.orders)} đơn</span>
              <span>{fmtVND(selected.revenue)}</span>
            </>
          ) : (
            <span>Chọn một ngày để xem số liệu</span>
          )}
        </div>
        <div className="dash-calendar-scale">
          <span>Ít</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} className={`level-${level}`} />
          ))}
          <span>Nhiều</span>
        </div>
      </div>
    </ChartCard>
  );
}

export default function Dashboard() {
  const [today, setToday] = useState(() => dateKey(Date.now()));
  const [period, setPeriod] = useState(() => getPeriod(30));
  const [draft, setDraft] = useState(() => getPeriod(30));
  const [preset, setPreset] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateError, setDateError] = useState("");
  const [revision, setRevision] = useState(0);
  const [trend, setTrend] = useState("revenue");
  const [productMetric, setProductMetric] = useState("units");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [hiddenSeries, setHiddenSeries] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrentRequest = true;
    const fetchStatistics = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getDashboardStatistics(period, controller.signal);
        if (!isCurrentRequest) return;
        if (!res.success) throw new Error(res.message);
        setData(res.data);
      } catch (err) {
        if (isCurrentRequest)
          setError(
            err.response?.data?.message ||
              err.message ||
              "Không thể tải thống kê.",
          );
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    };
    fetchStatistics();
    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [period, revision]);

  const choosePeriod = (days) => {
    const next = getPeriod(days);
    setPeriod(next);
    setDraft(next);
    setPreset(days);
    setDateError("");
    setSelectedStatus("");
  };
  const applyDates = (event) => {
    event.preventDefault();
    const days = (Date.parse(draft.end) - Date.parse(draft.start)) / DAY + 1;
    if (
      !Number.isInteger(days) ||
      days < 1 ||
      days > 366 ||
      draft.end > dateKey(Date.now())
    ) {
      setDateError("Chọn từ 1 đến 366 ngày, không vượt quá hôm nay.");
      return;
    }
    setDateError("");
    setPreset(0);
    setSelectedStatus("");
    setPeriod({ ...draft });
  };
  const toggleSeries = ({ dataKey: key }) =>
    setHiddenSeries((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key],
    );
  const exportReport = () => {
    if (!data) return;
    const rows = [
      [
        "SELENE - Báo cáo thống kê",
        `${data.period.start} - ${data.period.end}`,
      ],
      ["Chỉ tiêu", "Kỳ đã chọn", "Kỳ trước"],
      ...STATS.map((stat) => [
        stat.label,
        data.summary[stat.key],
        data.previous[stat.key],
      ]),
      [],
      [
        "Ngày đặt đơn",
        "Doanh thu ghi nhận (VND)",
        "Số đơn",
        "Doanh thu ngày tương ứng kỳ trước (VND)",
      ],
      ...data.timeline.map((point) => [
        point.date,
        point.revenue,
        point.orders,
        point.previousRevenue,
      ]),
      [],
      [
        "Doanh thu chỉ tính đơn đã giao / hoàn thành và đã thanh toán, theo ngày đặt đơn.",
      ],
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `selene-thong-ke-${data.period.start}-${data.period.end}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const statuses = (data?.statuses || []).map((item) => ({
    ...item,
    key: item.name,
    name: getOrderStatus(item.name).label,
    fill: STATUS_COLORS[item.name] || COLORS[7],
  }));
  const payments = (data?.payments || []).map((item) => ({
    ...item,
    name:
      PAYMENT_METHODS.find((method) => method.key === item.name)?.label ||
      "Khác",
  }));
  const products = [...(data?.products || [])]
    .sort((a, b) => b[productMetric] - a[productMetric])
    .slice(0, 6);
  const chosenStatus = statuses.find((item) => item.key === selectedStatus);
  const pending = statuses
    .filter((item) => ["pending", "unpaid"].includes(item.key))
    .reduce((sum, item) => sum + item.value, 0);
  const bestProduct = data?.products?.[0];
  const peakHour = [...(data?.hours || [])].sort(
    (a, b) => b.orders - a.orders,
  )[0];

  return (
    <div className="dash-page">
      <Helmet>
        <title>Tổng quan kinh doanh | SELENE</title>
      </Helmet>
      <div className="adm-page-head dash-page-head">
        <div>
          <div className="dash-eyebrow">
            <span /> SELENE / TỔNG QUAN
          </div>
          <h1 className="adm-page-title">
            Nhìn toàn cảnh.
            <br />
            <span>Nắm nhịp kinh doanh.</span>
          </h1>
        </div>
        <div className="dash-head-actions">
          <button
            className="btn dash-button"
            onClick={() => setRevision((value) => value + 1)}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise" /> Làm mới
          </button>
          <button
            className="btn dash-button primary"
            onClick={exportReport}
            disabled={!data || loading || !!error}
          >
            <i className="bi bi-download" /> Xuất báo cáo
          </button>
        </div>
      </div>

      <div className="dash-filter">
        <div className="adm-tabs dash-presets" aria-label="Khoảng thời gian">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              aria-pressed={preset === days}
              className={`adm-tab-btn ${preset === days ? "active" : ""}`}
              onClick={() => choosePeriod(days)}
            >
              {days} ngày qua
            </button>
          ))}
        </div>
        <form className="dash-date-form" onSubmit={applyDates}>
          <i className="bi bi-calendar3" />
          <input
            aria-label="Từ ngày"
            type="date"
            required
            max={today}
            onFocus={() => setToday(dateKey(Date.now()))}
            value={draft.start}
            onChange={(event) =>
              setDraft({ ...draft, start: event.target.value })
            }
          />
          <span>—</span>
          <input
            aria-label="Đến ngày"
            type="date"
            required
            min={draft.start}
            max={today}
            onFocus={() => setToday(dateKey(Date.now()))}
            value={draft.end}
            onChange={(event) =>
              setDraft({ ...draft, end: event.target.value })
            }
          />
          <button className="btn dash-button" type="submit">
            Áp dụng <i className="bi bi-arrow-right-short" />
          </button>
        </form>
      </div>
      {dateError && (
        <div className="text-danger small mb-3" role="alert">
          {dateError}
        </div>
      )}

      {loading ? (
        <div
          className="d-flex align-items-center justify-content-center"
          style={{ minHeight: "60vh" }}
        >
          <Loading text="Đang tổng hợp dữ liệu..." />
        </div>
      ) : error ? (
        <div className="dash-error" role="alert">
          <i className="bi bi-cloud-slash" />
          <h2>Chưa thể tải thống kê</h2>
          <p>{error}</p>
          <button
            className="btn dash-button primary"
            onClick={() => setRevision((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      ) : (
        data && (
          <>
            <div className="dash-period-note">
              <span>
                <i className="bi bi-calendar2-week" />{" "}
                {fullDate(data.period.start)} – {fullDate(data.period.end)}
              </span>
              <span>
                So với {fullDate(data.period.previousStart)} –{" "}
                {fullDate(data.period.previousEnd)}
              </span>
            </div>
            <div className="row g-3 mb-4">
              {STATS.map((stat, index) => (
                <div className="col-12 col-sm-6 col-xl-4" key={stat.key}>
                  <article
                    className={`dash-stat-card ${index === 0 ? "featured" : ""}`}
                    title={stat.note}
                  >
                    <div className="dash-stat-top">
                      <span>{stat.label}</span>
                      <i className={`bi ${stat.icon}`} />
                    </div>
                    <div
                      className="dash-stat-value"
                      title={
                        stat.money
                          ? fmtVND(data.summary[stat.key])
                          : number(data.summary[stat.key])
                      }
                    >
                      {stat.money
                        ? compact(data.summary[stat.key])
                        : number(data.summary[stat.key])}
                      <small>
                        {stat.money ? " ₫" : stat.percent ? "%" : ""}
                      </small>
                    </div>
                    <div className="dash-stat-comparison">
                      <Change
                        value={data.summary[stat.key]}
                        previous={data.previous[stat.key]}
                        percent={stat.percent}
                      />
                      <span>so với kỳ trước</span>
                    </div>
                  </article>
                </div>
              ))}
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-xl-8">
                <ChartCard
                  title="Nhịp tăng trưởng"
                  subtitle={
                    trend === "revenue"
                      ? "Doanh thu theo ngày đặt đơn · đối chiếu kỳ trước cùng độ dài"
                      : "Số đơn được tạo mỗi ngày · bao gồm mọi trạng thái"
                  }
                  icon="bi-graph-up-arrow"
                  action={
                    <div className="adm-tabs dash-segment">
                      {[
                        ["revenue", "Doanh thu"],
                        ["orders", "Đơn hàng"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          className={`adm-tab-btn ${trend === key ? "active" : ""}`}
                          aria-pressed={trend === key}
                          onClick={() => setTrend(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  }
                >
                  <div className="dash-chart-summary">
                    <strong>
                      {trend === "revenue"
                        ? fmtVND(data.summary.revenue)
                        : `${number(data.summary.orders)} đơn`}
                    </strong>
                    <span>trong {data.period.days} ngày</span>
                  </div>
                  <div className="dash-chart-lg">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        key={`${period.start}-${period.end}`}
                        data={data.timeline}
                        margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
                      >
                        <defs>
                          <linearGradient
                            id="dashRevenueFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#871b1b"
                              stopOpacity={0.23}
                            />
                            <stop
                              offset="100%"
                              stopColor="#871b1b"
                              stopOpacity={0.01}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          vertical={false}
                          stroke="#efedeb"
                          strokeDasharray="4 5"
                        />
                        <XAxis
                          dataKey="date"
                          {...AXIS}
                          tickFormatter={shortDate}
                          minTickGap={35}
                        />
                        <YAxis
                          {...AXIS}
                          tickFormatter={compact}
                          width={55}
                          allowDecimals={trend === "revenue"}
                        />
                        <Tooltip
                          content={<ChartTooltip />}
                          labelFormatter={(label) => fullDate(label)}
                        />
                        <Legend
                          onClick={toggleSeries}
                          wrapperStyle={{
                            fontSize: 12,
                            paddingTop: 18,
                            cursor: "pointer",
                          }}
                        />
                        {trend === "revenue" ? (
                          <>
                            <Area
                              type="monotone"
                              dataKey="revenue"
                              name="Kỳ đã chọn"
                              stroke={COLORS[0]}
                              strokeWidth={3}
                              fill="url(#dashRevenueFill)"
                              activeDot={{
                                r: 6,
                                strokeWidth: 3,
                                stroke: "#fff",
                              }}
                              hide={hiddenSeries.includes("revenue")}
                            />
                            <Line
                              type="monotone"
                              dataKey="previousRevenue"
                              name="Kỳ trước (ngày tương ứng)"
                              stroke="#b9ada6"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                              hide={hiddenSeries.includes("previousRevenue")}
                            />
                          </>
                        ) : (
                          <Bar
                            dataKey="orders"
                            name="Đơn hàng"
                            fill={COLORS[0]}
                            radius={[5, 5, 0, 0]}
                            maxBarSize={26}
                            hide={hiddenSeries.includes("orders")}
                          />
                        )}
                        {data.timeline.length > 7 && (
                          <Brush
                            dataKey="date"
                            height={22}
                            stroke="#b76e65"
                            fill="#fcf8f6"
                            tickFormatter={shortDate}
                            travellerWidth={8}
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>
              <div className="col-12 col-xl-4">
                <ChartCard
                  title="Bức tranh đơn hàng"
                  subtitle="Phân bổ trạng thái của các đơn trong kỳ"
                  icon="bi-pie-chart"
                >
                  {statuses.length ? (
                    <>
                      <div className="dash-donut">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statuses}
                              dataKey="value"
                              nameKey="name"
                              innerRadius="68%"
                              outerRadius="90%"
                              paddingAngle={statuses.length > 1 ? 3 : 0}
                              stroke="none"
                              onClick={(entry) =>
                                setSelectedStatus(
                                  entry.key === selectedStatus ? "" : entry.key,
                                )
                              }
                            >
                              {statuses.map((item) => (
                                <Cell
                                  key={item.key}
                                  fill={item.fill}
                                  opacity={
                                    selectedStatus &&
                                    selectedStatus !== item.key
                                      ? 0.25
                                      : 1
                                  }
                                  style={{ cursor: "pointer" }}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="dash-donut-center">
                          <strong>
                            {number(chosenStatus?.value ?? data.summary.orders)}
                          </strong>
                          <span>{chosenStatus?.name || "tổng đơn hàng"}</span>
                        </div>
                      </div>
                      <div className="dash-status-list">
                        {statuses.map((item) => (
                          <button
                            key={item.key}
                            aria-pressed={selectedStatus === item.key}
                            className={
                              selectedStatus === item.key ? "active" : ""
                            }
                            onClick={() =>
                              setSelectedStatus(
                                selectedStatus === item.key ? "" : item.key,
                              )
                            }
                          >
                            <span>
                              <i style={{ background: item.fill }} />
                              {item.name}
                            </span>
                            <b>
                              {item.value}
                              <small>
                                {number(
                                  (item.value / data.summary.orders) * 100,
                                )}
                                %
                              </small>
                            </b>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <EmptyChart />
                  )}
                </ChartCard>
              </div>
            </div>

            <div className="dash-insights mb-3">
              <div className="dash-insight-title">
                <i className="bi bi-stars" />
                <span>
                  ĐIỂM NHẤN
                  <br />
                  <strong>Trong kỳ này</strong>
                </span>
              </div>
              <div>
                <span>Cần theo dõi</span>
                <strong>{number(pending)} đơn</strong>
                <p>Chờ xác nhận hoặc chưa thanh toán</p>
              </div>
              <div>
                <span>Được yêu thích nhất</span>
                <strong title={bestProduct?.name}>
                  {bestProduct?.name || "Chưa có sản phẩm bán"}
                </strong>
                <p>
                  {bestProduct
                    ? `${number(bestProduct.units)} sản phẩm từ đơn ghi nhận`
                    : "Dữ liệu xuất hiện khi có đơn đủ điều kiện"}
                </p>
              </div>
              <div>
                <span>Khung giờ nổi bật</span>
                <strong>{peakHour?.orders ? peakHour.name : "—"}</strong>
                <p>
                  {peakHour?.orders
                    ? `${number(peakHour.orders)} đơn được đặt trong kỳ`
                    : "Chưa có đơn được đặt trong kỳ"}
                </p>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-xl-7">
                <ChartCard
                  title="Những thiết kế được yêu thích"
                  subtitle="6 sản phẩm dẫn đầu từ đơn ghi nhận"
                  icon="bi-award"
                  action={
                    <AdminSelect
                      aria-label="Xếp hạng sản phẩm theo"
                      value={productMetric}
                      onChange={(event) => setProductMetric(event.target.value)}
                    >
                      <option value="units">Theo số lượng</option>
                      <option value="revenue">Theo tiền hàng</option>
                    </AdminSelect>
                  }
                >
                  {products.length ? (
                    <div className="dash-chart-md">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={products}
                          layout="vertical"
                          margin={{ left: 0, right: 25, top: 5, bottom: 5 }}
                        >
                          <CartesianGrid
                            horizontal={false}
                            stroke="#efedeb"
                            strokeDasharray="4 5"
                          />
                          <XAxis
                            type="number"
                            {...AXIS}
                            tickFormatter={compact}
                            allowDecimals={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            {...AXIS}
                            width={125}
                            tickFormatter={(value) =>
                              value.length > 18
                                ? `${value.slice(0, 18)}…`
                                : value
                            }
                          />
                          <Tooltip
                            content={
                              <ChartTooltip
                                money={productMetric === "revenue"}
                              />
                            }
                            cursor={{ fill: "#f7f4f1" }}
                          />
                          <Bar
                            dataKey={productMetric}
                            name={
                              productMetric === "units"
                                ? "Sản phẩm"
                                : "Tiền hàng"
                            }
                            radius={[0, 5, 5, 0]}
                            maxBarSize={23}
                          >
                            {products.map((item, index) => (
                              <Cell
                                key={item.id}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyChart text="Chưa có sản phẩm từ đơn ghi nhận" />
                  )}
                  <div className="dash-chart-foot">
                    Tiền hàng = đơn giá × số lượng, trước giảm giá cấp đơn và
                    phí vận chuyển.
                  </div>
                </ChartCard>
              </div>
              <div className="col-12 col-xl-5">
                <ChartCard
                  title="Dòng thanh toán"
                  subtitle="Số đơn theo phương thức và trạng thái thanh toán"
                  icon="bi-credit-card-2-front"
                >
                  {payments.length ? (
                    <div className="dash-chart-md">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={payments}
                          maxBarSize={44}
                          margin={{ left: -20, right: 5, top: 10, bottom: 0 }}
                        >
                          <CartesianGrid
                            vertical={false}
                            stroke="#efedeb"
                            strokeDasharray="4 5"
                          />
                          <XAxis
                            dataKey="name"
                            {...AXIS}
                            tickFormatter={(value) =>
                              value === "Thanh toán khi nhận hàng"
                                ? "COD"
                                : value === "Chuyển khoản ngân hàng"
                                  ? "Ngân hàng"
                                  : value
                            }
                          />
                          <YAxis {...AXIS} allowDecimals={false} />
                          <Tooltip
                            content={<ChartTooltip />}
                            cursor={{ fill: "#f7f4f1" }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                          />
                          <Bar
                            dataKey="paid"
                            name="Đã thanh toán"
                            stackId="payment"
                            fill={COLORS[0]}
                          />
                          <Bar
                            dataKey="unpaid"
                            name="Chưa thanh toán"
                            stackId="payment"
                            fill="#d7b7af"
                          />
                          <Bar
                            dataKey="refunded"
                            name="Đã hoàn tiền"
                            stackId="payment"
                            fill={COLORS[1]}
                          />
                          <Bar
                            dataKey="unknown"
                            name="Khác"
                            stackId="payment"
                            fill="#9a8d9e"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyChart />
                  )}
                </ChartCard>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-xl-4">
                <ChartCard
                  title="Ngày mua sắm"
                  subtitle="Trung bình số đơn mỗi ngày trong tuần"
                  icon="bi-calendar-week"
                >
                  <div className="dash-chart-sm">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.weekdays}
                        margin={{ left: -25, right: 10, top: 10 }}
                      >
                        <CartesianGrid vertical={false} stroke="#efedeb" />
                        <XAxis
                          dataKey="name"
                          {...AXIS}
                          tickFormatter={(value) =>
                            value.replace("Thứ ", "T").replace("Chủ nhật", "CN")
                          }
                        />
                        <YAxis {...AXIS} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar
                          dataKey="average"
                          name="Đơn / ngày"
                          fill={COLORS[0]}
                          radius={[5, 5, 0, 0]}
                          maxBarSize={28}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>
              <div className="col-12 col-xl-4">
                <ChartCard
                  title="Giờ đặt hàng"
                  subtitle="Đơn hàng theo giờ Việt Nam"
                  icon="bi-clock"
                >
                  <div className="dash-chart-sm">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={data.hours}
                        margin={{ left: -25, right: 10, top: 10 }}
                      >
                        <CartesianGrid vertical={false} stroke="#efedeb" />
                        <XAxis dataKey="name" {...AXIS} interval={5} />
                        <YAxis {...AXIS} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="orders"
                          name="Đơn hàng"
                          stroke={COLORS[0]}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>
              <div className="col-12 col-xl-4">
                <ChartCard
                  title="Kích cỡ được chọn"
                  subtitle="Số sản phẩm theo size từ đơn ghi nhận"
                  icon="bi-rulers"
                >
                  {data.sizes.length ? (
                    <div className="dash-chart-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.sizes}
                            dataKey="value"
                            nameKey="name"
                            outerRadius="75%"
                            stroke="#fff"
                            strokeWidth={3}
                          >
                            {data.sizes.map((item, index) => (
                              <Cell
                                key={item.name}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyChart text="Chưa có dữ liệu kích cỡ" />
                  )}
                </ChartCard>
              </div>
            </div>

            <div className="mb-4">
              <SalesCalendar
                key={`${period.start}-${period.end}`}
                timeline={data.timeline}
              />
            </div>

            <ChartCard
              title="Những đơn hàng gần đây"
              subtitle="6 đơn mới nhất trong kỳ"
              icon="bi-receipt"
              action={
                <Link className="dash-text-link" to="/admin/don-hang">
                  Tất cả đơn hàng <i className="bi bi-arrow-up-right" />
                </Link>
              }
            >
              {data.recentOrders.length ? (
                <div className="table-responsive dash-orders">
                  <table className="table adm-table">
                    <thead>
                      <tr>
                        <th>Mã đơn hàng</th>
                        <th>Khách hàng</th>
                        <th>Ngày đặt</th>
                        <th>Giá trị</th>
                        <th>Trạng thái</th>
                        <th>
                          <span className="visually-hidden">Chi tiết</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentOrders.map((order) => {
                        const status = getOrderStatus(order.status);
                        return (
                          <tr key={order.order_id}>
                            <td>
                              <Link
                                to={`/admin/don-hang/${encodeURIComponent(order.order_id)}`}
                                className="dash-order-code"
                              >
                                {order.order_code || order.order_id}
                              </Link>
                            </td>
                            <td>
                              <span className="dash-customer-avatar">
                                {(order.recipient_name || "K")
                                  .trim()
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </span>
                              {order.recipient_name || "Khách hàng"}
                            </td>
                            <td>{fullDate(order.created_at)}</td>
                            <td className="fw-bold">
                              {fmtVND(order.final_amount)}
                            </td>
                            <td>
                              <span
                                className={`badge dash-order-status text-${status.color} bg-${status.color}-subtle`}
                              >
                                {status.label}
                              </span>
                            </td>
                            <td>
                              <Link
                                className="dash-order-arrow"
                                aria-label={`Xem đơn ${order.order_code || order.order_id}`}
                                to={`/admin/don-hang/${encodeURIComponent(order.order_id)}`}
                              >
                                <i className="bi bi-arrow-up-right" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyChart text="Chưa có đơn hàng trong kỳ" />
              )}
            </ChartCard>
            <footer className="dash-footer">
              <p>
                <i className="bi bi-info-circle" /> Tất cả thống kê được nhóm
                theo ngày đặt đơn (GMT+7). Doanh thu chỉ tính đơn đã giao / hoàn
                thành và đã thanh toán; gồm giảm giá và phí vận chuyển. Trạng
                thái là trạng thái hiện tại của đơn, nên số liệu kỳ trước có thể
                thay đổi.
              </p>
              <span>
                <i className="bi bi-check2-circle" /> Cập nhật{" "}
                {new Date(data.updatedAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </span>
            </footer>
          </>
        )
      )}
    </div>
  );
}

import { DashboardModel } from "../models/dashboard.model.js";

const DAY = 86400000;
const OFFSET = 7 * 3600000;
const dateKey = (value) =>
  new Date(new Date(value).getTime() + OFFSET).toISOString().slice(0, 10);
const isRecognized = (order) =>
  ["delivered", "completed"].includes(order.status) &&
  order.payment_status === "paid";
const amount = (value) => Number(value) || 0;

export const getDashboardRange = (query, now = new Date()) => {
  const today = dateKey(now);
  const endDate = query.end || today;
  const parseDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return NaN;
    const timestamp = Date.parse(`${value}T00:00:00+07:00`);
    return Number.isFinite(timestamp) && dateKey(timestamp) === value
      ? timestamp
      : NaN;
  };
  const parsedEnd = parseDate(endDate);
  const startDate =
    query.start ||
    (Number.isFinite(parsedEnd) ? dateKey(parsedEnd - 29 * DAY) : "");
  const start = parseDate(startDate);
  const end = parseDate(endDate) + DAY;
  const days = (end - start) / DAY;
  if (!Number.isInteger(days) || days < 1 || days > 366 || endDate > today) {
    const error = new Error(
      "Vui lòng chọn khoảng ngày hợp lệ, tối đa 366 ngày và không vượt quá hôm nay!",
    );
    error.status = 400;
    throw error;
  }
  return {
    start,
    end,
    days,
    startDate,
    endDate,
    previousStart: start - days * DAY,
  };
};

const summarize = (orders) => {
  const recognized = orders.filter(isRecognized);
  const revenue = recognized.reduce(
    (sum, order) => sum + amount(order.final_amount),
    0,
  );
  return {
    revenue,
    orders: orders.length,
    units: recognized.reduce(
      (sum, order) =>
        sum +
        (order.order_items || []).reduce(
          (total, item) => total + amount(item.quantity),
          0,
        ),
      0,
    ),
    buyers: new Set(recognized.map((order) => order.account_id).filter(Boolean))
      .size,
    average: recognized.length ? revenue / recognized.length : 0,
    completion: orders.length
      ? (orders.filter((order) =>
          ["delivered", "completed"].includes(order.status),
        ).length /
          orders.length) *
        100
      : 0,
    recognized: recognized.length,
  };
};

export const buildDashboardStatistics = (orders, range) => {
  const current = orders.filter((order) => {
    const time = Date.parse(order.created_at);
    return time >= range.start && time < range.end;
  });
  const previous = orders.filter((order) => {
    const time = Date.parse(order.created_at);
    return time >= range.previousStart && time < range.start;
  });
  const timeline = Array.from({ length: range.days }, (_, index) => ({
    date: dateKey(range.start + index * DAY),
    revenue: 0,
    orders: 0,
    previousRevenue: 0,
  }));
  const statuses = {};
  const payments = {};
  const products = {};
  const sizes = {};
  const weekdays = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ].map((name) => ({ name, orders: 0, days: 0, average: 0 }));
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    name: `${String(hour).padStart(2, "0")}h`,
    orders: 0,
  }));

  timeline.forEach((point, index) => {
    weekdays[new Date(range.start + index * DAY + OFFSET).getUTCDay()].days +=
      1;
  });
  previous.forEach((order) => {
    if (isRecognized(order))
      timeline[
        Math.floor((Date.parse(order.created_at) - range.previousStart) / DAY)
      ].previousRevenue += amount(order.final_amount);
  });
  current.forEach((order) => {
    const index = Math.floor(
      (Date.parse(order.created_at) - range.start) / DAY,
    );
    const local = new Date(Date.parse(order.created_at) + OFFSET);
    const status =
      order.status === "cancel" ? "cancelled" : order.status || "unknown";
    statuses[status] = (statuses[status] || 0) + 1;
    const method = order.payment_method || "unknown";
    if (!payments[method])
      payments[method] = {
        name: method,
        paid: 0,
        unpaid: 0,
        refunded: 0,
        unknown: 0,
      };
    const paymentStatus = ["paid", "unpaid", "refunded"].includes(
      order.payment_status,
    )
      ? order.payment_status
      : "unknown";
    payments[method][paymentStatus] += 1;
    timeline[index].orders += 1;
    weekdays[local.getUTCDay()].orders += 1;
    hours[local.getUTCHours()].orders += 1;

    if (!isRecognized(order)) return;
    timeline[index].revenue += amount(order.final_amount);
    (order.order_items || []).forEach((item) => {
      const key = item.product_id || item.product_name || "unknown";
      if (!products[key])
        products[key] = {
          id: key,
          name: item.product_name || "Sản phẩm đã xóa",
          units: 0,
          revenue: 0,
        };
      products[key].units += amount(item.quantity);
      products[key].revenue += amount(item.quantity) * amount(item.unit_price);
      const size = item.size || "Không phân loại";
      sizes[size] = (sizes[size] || 0) + amount(item.quantity);
    });
  });
  weekdays.forEach((day) => {
    day.average = day.days ? Number((day.orders / day.days).toFixed(2)) : 0;
  });

  return {
    period: {
      start: range.startDate,
      end: range.endDate,
      days: range.days,
      previousStart: dateKey(range.previousStart),
      previousEnd: dateKey(range.start - DAY),
    },
    summary: summarize(current),
    previous: summarize(previous),
    timeline,
    statuses: Object.entries(statuses).map(([name, value]) => ({
      name,
      value,
    })),
    payments: Object.values(payments),
    products: Object.values(products).sort(
      (a, b) => b.units - a.units || b.revenue - a.revenue,
    ),
    sizes: Object.entries(sizes)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    weekdays: [...weekdays.slice(1), weekdays[0]],
    hours,
    recentOrders: [...current]
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 6)
      .map(({ order_items, account_id, ...order }) => order),
    updatedAt: new Date().toISOString(),
  };
};

export const getDashboardStatistics = async (query) => {
  const range = getDashboardRange(query);
  const orders = await DashboardModel.findOrdersByDateRange(
    new Date(range.previousStart).toISOString(),
    new Date(range.end).toISOString(),
  );
  return buildDashboardStatistics(orders, range);
};

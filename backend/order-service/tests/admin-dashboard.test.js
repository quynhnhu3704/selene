import test, { mock } from "node:test";
import assert from "node:assert/strict";

mock.module("../src/configs/supabase.js", {
  namedExports: { supabase: { from: () => {} } },
});
const customerRpc = { request: async () => null };
mock.module("../src/configs/rabbitmq.js", {
  namedExports: { requestProductDetails: (...args) => customerRpc.request(...args) },
});
const { supabase } = await import("../src/configs/supabase.js");
const { DashboardModel } = await import("../src/models/dashboard.model.js");
const { getDashboardRange, buildDashboardStatistics, getDashboardStatistics } = await import(
  "../src/services/dashboard.service.js"
);
const { handleGetDashboardStatistics } = await import(
  "../src/controllers/dashboard.controller.js"
);
const now = new Date("2026-11-15T12:00:00Z");
const range = getDashboardRange({ start: "2026-11-14", end: "2026-11-15" }, now);
const order = (created_at, overrides = {}) => ({
  order_id: created_at, created_at, account_id: "buyer", status: "delivered",
  payment_status: "paid", payment_method: "cod", final_amount: "90",
  order_items: [{ product_id: "p", product_name: "Product", quantity: 2, unit_price: "50", size: "M" }],
  ...overrides,
});

test("dashboard dates use Vietnam midnight and an equal previous period", () => {
  assert.equal(new Date(range.start).toISOString(), "2026-11-13T17:00:00.000Z");
  assert.equal(new Date(range.end).toISOString(), "2026-11-15T17:00:00.000Z");
  assert.equal(range.start - range.previousStart, range.end - range.start);
  assert.equal(getDashboardRange({}, now).days, 30);
  assert.equal(getDashboardRange({}, new Date("2026-11-14T17:00:00Z")).endDate, "2026-11-15");
  for (const query of [
    { start: "2026-02-30" }, { end: "invalid" }, { start: ["2026-11-14"] },
    { start: "2026-11-15", end: "2026-11-14" }, { end: "2026-11-16" },
    { start: "2025-01-01", end: "2026-11-15" },
  ]) assert.throws(() => getDashboardRange(query, now), { status: 400 });
});

test("dashboard aggregates paid delivered orders and keeps all order counts", () => {
  const data = buildDashboardStatistics([
    order("2026-11-11T17:00:00Z"), // Previous period, first midnight.
    order("2026-11-13T17:00:00Z"), // Current period, first midnight.
    order("2026-11-14T06:00:00Z", { status: "completed" }),
    order("2026-11-14T17:00:00Z", { status: "pending", payment_status: "unpaid" }),
    order("2026-11-15T16:59:59Z", { status: "cancel", payment_status: "refunded" }),
    order("2026-11-15T17:00:00Z"), // Outside the selected period.
  ], range);
  assert.deepEqual(data.summary, { revenue: 180, orders: 4, units: 4, buyers: 1, average: 90, completion: 50, recognized: 2 });
  assert.equal(data.previous.revenue, 90);
  assert.deepEqual(data.timeline.map(p => [p.orders, p.revenue, p.previousRevenue]), [[2, 180, 90], [2, 0, 0]]);
  assert.equal(data.products[0].revenue, 200);
  assert.deepEqual(data.sizes, [{ name: "M", value: 4 }]);
  assert.equal(data.statuses.find(s => s.name === "cancelled").value, 1);
  assert.deepEqual(data.payments, [{ name: "cod", paid: 2, unpaid: 1, refunded: 1, unknown: 0 }]);
  assert.equal(data.hours[0].orders, 2);
  assert.equal(data.weekdays.reduce((sum, day) => sum + day.orders, 0), 4);
  assert.equal(data.recentOrders[0].created_at, "2026-11-15T16:59:59Z");
  assert.equal("order_items" in data.recentOrders[0], false);
});

test("empty dashboard returns zero metrics and a complete timeline", () => {
  const data = buildDashboardStatistics([], range);
  assert.ok(Object.values(data.summary).every(value => value === 0));
  assert.equal(data.timeline.length, 2);
  assert.equal(data.hours.length, 24);
  assert.equal(data.weekdays.length, 7);
  assert.deepEqual(data.products, []);
});

test("product names and sizes cannot collide with object prototype keys", () => {
  const data = buildDashboardStatistics([order("2026-11-14T00:00:00Z", {
    order_items: [{ product_name: "constructor", quantity: 1, unit_price: 50, size: "__proto__" }],
  })], range);
  assert.deepEqual(data.products, [{ id: "constructor", name: "constructor", units: 1, revenue: 50 }]);
  assert.deepEqual(data.sizes, [{ name: "__proto__", value: 1 }]);
});

test("model fetches all pages even when the server returns fewer than 500 rows", async t => {
  const rows = Array.from({ length: 1101 }, (_, order_id) => ({ order_id }));
  const offsets = [];
  const filters = [];
  const query = {
    select() { return this; },
    gte(...args) { filters.push(args); return this; },
    lt(...args) { filters.push(args); return this; },
    order() { return this; },
    async range(from) { offsets.push(from); return { data: rows.slice(from, from + 200), count: rows.length, error: null }; },
  };
  t.mock.method(supabase, "from", () => query);
  assert.deepEqual(await DashboardModel.findOrdersByDateRange("start", "end"), rows);
  assert.deepEqual(offsets, [0, 200, 400, 600, 800, 1000]);
  assert.deepEqual(filters.slice(0, 2), [["created_at", "start"], ["created_at", "end"]]);
});

test("controller returns the dashboard contract, validation errors and safe server errors", async t => {
  t.mock.method(DashboardModel, "findOrdersByDateRange", async () => []);
  const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await handleGetDashboardStatistics({ query: {} }, response);
  assert.equal(response.code, 200);
  assert.equal(response.body.success, true);
  for (const key of ["period", "summary", "previous", "timeline", "statuses", "payments", "products", "sizes", "weekdays", "hours", "recentOrders", "updatedAt"])
    assert.ok(key in response.body.data, key);
  await handleGetDashboardStatistics({ query: { end: "invalid" } }, response);
  assert.equal(response.code, 400);
  t.mock.method(DashboardModel, "findOrdersByDateRange", async () => { throw new Error("private database details"); });
  await handleGetDashboardStatistics({ query: {} }, response);
  assert.equal(response.code, 500);
  assert.equal(response.body.success, false);
  assert.ok(!response.body.message.includes("private"));
});


test("recent orders include customer profiles with one lookup per account", async (t) => {
  const rows = Array.from({ length: 8 }, (_, index) => order(
    `2026-11-15T0${index}:00:00Z`, { order_id: `order-${index}` },
  ));
  t.mock.method(DashboardModel, "findOrdersByDateRange", async () => rows);
  const lookup = t.mock.method(customerRpc, "request", async (payload, queue) => {
    assert.deepEqual(payload, { account_id: "buyer" });
    assert.equal(queue, "rpc_customer_profile_queue");
    return { account_id: "buyer", email: "buyer@example.com", avatar_url: "/avatar.png" };
  });
  const data = await getDashboardStatistics({ start: "2026-11-14", end: "2026-11-15" });
  assert.equal(data.recentOrders.length, 6);
  assert.equal(lookup.mock.callCount(), 1);
  for (const recent of data.recentOrders) {
    assert.deepEqual(recent.customer, { email: "buyer@example.com", avatar_url: "/avatar.png" });
    assert.equal("account_id" in recent, false);
  }
});

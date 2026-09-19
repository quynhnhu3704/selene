// Run from backend/order-service: node test/admin-orders.integration.mjs --live
// Uses local services and creates temporary orders; removes only its own orders.
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { config } from "../src/configs/index.js";
import { OrderModel } from "../src/models/order.model.js";

if (!process.argv.includes("--live"))
  throw new Error("Pass --live to test running local services.");
const base = "http://localhost:5173/api";
const permissions = [
  "order:view",
  "order:create",
  "order:update",
  "profile:view",
];
const token = (role, grants = permissions) =>
  jwt.sign(
    { accountId: "order-integration-test", role, permissions: grants },
    config.jwtAccessSecret,
    { expiresIn: "10m" },
  );
const admin = token("admin");
const ids = [];
let count = 0;
async function api(
  path,
  { method = "GET", body, auth = admin, expected = 200 } = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${auth}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  const data = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${data.message}`);
  count++;
  return data.data;
}
const detail = (id) => api(`/orders/manage/orders/${id}`);
const update = (id, body, options = {}) =>
  api(`/orders/manage/orders/${id}`, { method: "PUT", body, ...options });
let productId, variantId, initialStock;
async function stock() {
  const product = await api(`/products/product-detail/${productId}`);
  return Number(
    product.variants.find((row) => row.variant_id === variantId).stock_quantity,
  );
}
try {
  const customers = await api(
    "/auth/manage/users?role=customer&status=active&limit=1",
  );
  assert.ok(customers.length, "Need an active customer fixture");
  const products = await api("/products/product-list?limit=100");
  let variant;
  for (const product of products) {
    const data = await api(`/products/product-detail/${product.product_id}`);
    variant = data.variants.find((row) => Number(row.stock_quantity) >= 3);
    if (variant) {
      productId = product.product_id;
      variantId = variant.variant_id;
      break;
    }
  }
  assert.ok(variant, "Need an in-stock product fixture");
  initialStock = await stock();
  const marker = `ORDER_TEST_${Date.now()}`;
  const payload = {
    account_id: customers[0].account_id,
    profile_id: customers[0].profile_id,
    recipient_name: marker,
    recipient_phone: "0900000000",
    recipient_address: "Temporary integration test",
    payment_method: "cod",
    shipping_fee: 10000,
    total_discount_price: 0,
    order_items: [{ variant_id: variantId, quantity: 1 }],
  };
  await api("/orders/manage/orders", {
    method: "POST",
    body: payload,
    auth: token("customer"),
    expected: 403,
  });
  await api("/orders/manage/orders", {
    method: "POST",
    body: payload,
    auth: token("admin", ["order:view"]),
    expected: 403,
  });
  await api("/orders/manage/orders", {
    method: "POST",
    body: { ...payload, recipient_phone: "123" },
    expected: 400,
  });
  await api("/orders/manage/orders", {
    method: "POST",
    body: { ...payload, order_items: [{ variant_id: variantId, quantity: 0 }] },
    expected: 400,
  });
  for (let i = 0; i < 2; i++) {
    const created = await api("/orders/manage/orders", {
      method: "POST",
      body: payload,
      expected: 201,
    });
    ids.push(created.order_id);
    assert.equal(
      Number(created.final_amount),
      Number(created.order_items[0].unit_price) + 10000,
    );
  }
  assert.equal(await stock(), initialStock - 2);
  const list = await api(`/orders/manage/orders?q=${marker}&limit=1`);
  assert.equal(list.orders.length, 1);
  assert.equal(list.pagination.total_items, 2);
  const exported = await fetch(
    `${base}/orders/manage/orders/export?q=${marker}&limit=1`,
    { headers: { Authorization: `Bearer ${admin}` } },
  );
  assert.equal(exported.status, 200);
  assert.match(exported.headers.get("content-type"), /text\/csv/);
  assert.equal(
    (await exported.text()).trim().split("\r\n").length,
    3,
    "Export must include every filtered order, not only one page",
  );
  let order = await detail(ids[0]);
  const originalTimestamp = order.updated_at;
  await update(ids[0], {
    updated_at: order.updated_at,
    recipient_address: "Updated address",
  });
  order = await detail(ids[0]);
  assert.equal(order.recipient_address, "Updated address");
  await update(
    ids[0],
    { updated_at: originalTimestamp, status: "confirmed" },
    { expected: 409 },
  );
  await update(
    ids[0],
    { updated_at: order.updated_at, recipient_name: "Forbidden" },
    { auth: token("staff"), expected: 403 },
  );
  await update(
    ids[0],
    { updated_at: order.updated_at, status: "invalid" },
    { expected: 400 },
  );
  await update(
    ids[0],
    {
      updated_at: order.updated_at,
      total_discount_price: Number(order.total_original_price) + 1,
    },
    { expected: 400 },
  );
  const item = order.order_items[0];
  await update(ids[0], {
    updated_at: order.updated_at,
    order_items: [
      {
        order_item_id: item.order_item_id,
        quantity: 2,
        unit_price: item.unit_price,
      },
    ],
    shipping_fee: 20000,
  });
  order = await detail(ids[0]);
  assert.equal(Number(order.final_amount), Number(item.unit_price) * 2 + 20000);
  assert.equal(Number(order.order_items[0].quantity), 2);
  assert.equal(await stock(), initialStock - 3);
  await update(
    ids[0],
    {
      updated_at: order.updated_at,
      order_items: [
        {
          order_item_id: item.order_item_id,
          quantity: initialStock + 10,
          unit_price: item.unit_price,
        },
      ],
    },
    { expected: 400 },
  );
  order = await detail(ids[0]);
  assert.equal(
    Number(order.order_items[0].quantity),
    2,
    "Insufficient stock must roll back edits",
  );
  assert.equal(Number(order.final_amount), Number(item.unit_price) * 2 + 20000);
  await update(
    ids[0],
    { updated_at: order.updated_at, status: "cancelled" },
    { auth: token("staff") },
  );
  assert.equal(await stock(), initialStock - 1);
  order = await detail(ids[0]);
  await update(ids[0], {
    updated_at: order.updated_at,
    recipient_address: "Cancelled address edit",
  });
  assert.equal(
    await stock(),
    initialStock - 1,
    "Editing a cancelled order must not reserve stock",
  );
  console.log(
    `PASS: ${count} API checks; create, export, edit, permissions, conflicts, totals, stock and rollback.`,
  );
} finally {
  for (const id of ids) {
    const order = await detail(id);
    if (!["cancel", "cancelled"].includes(order.status))
      await update(id, { updated_at: order.updated_at, status: "cancelled" });
    await OrderModel.deleteIncompleteOrder(id);
  }
  if (initialStock !== undefined)
    assert.equal(await stock(), initialStock, "Fixture stock restored");
  console.log(`Cleaned up ${ids.length} temporary orders; stock restored.`);
}

import test, { mock } from "node:test";
import assert from "node:assert/strict";
process.env.JWT_ACCESS_SECRET = "test";
process.env.JWT_REFRESH_SECRET = "test";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_KEY = "test";
let stockCalls = [];
let failReserve = false;
mock.module("../src/configs/rabbitmq.js", {
  namedExports: {
    requestProductDetails: async () => [
      {
        variant_id: "v",
        product_id: "p",
        product_name: "Test",
        original_price: 100,
        stock_quantity: 10,
      },
    ],
    sendOrderNotificationEvent: async () => {},
  },
});
mock.module("../src/services/stock.service.js", {
  namedExports: {
    reserveStock: async (items) => {
      stockCalls.push(["reserve", items]);
      if (failReserve) throw new Error("stock failed");
    },
    restoreStock: async (items) => {
      stockCalls.push(["restore", items]);
    },
  },
});
const { OrderModel } = await import("../src/models/order.model.js");
const { createOrderForAdmin, updateOrderForAdmin, getOrderByIdForAdmin } =
  await import("../src/services/order.service.js");
function setup(t) {
  stockCalls = [];
  failReserve = false;
  const order = {
    order_id: "o",
    status: "pending",
    updated_at: "v1",
    total_original_price: 200,
    total_discount_price: 0,
    shipping_fee: 10,
    order_items: [
      { order_item_id: "i", variant_id: "v", quantity: 2, unit_price: 100 },
    ],
  };
  const writes = [];
  t.mock.method(OrderModel, "findById", async () => structuredClone(order));
  t.mock.method(OrderModel, "updateForAdmin", async (old, changes) => {
    writes.push(changes);
    return { ...old, ...changes, updated_at: "v2" };
  });
  t.mock.method(OrderModel, "updateItemsForAdmin", async () => {});
  t.mock.method(OrderModel, "createOrder", async (data) => data);
  t.mock.method(OrderModel, "createOrderItems", async () => {});
  t.mock.method(OrderModel, "deleteIncompleteOrder", async () => {});
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    json: async () => ({
      data: { account_id: "a", role_name: "customer", status: "active" },
    }),
  }));
  const input = {
    account_id: "a",
    profile_id: "profile",
    recipient_name: " Test ",
    recipient_phone: "0901234567",
    recipient_address: " Address ",
    payment_method: "cod",
    shipping_fee: 10,
    total_discount_price: 20,
    order_items: [{ variant_id: "v", quantity: 2 }],
  };
  return { order, writes, input };
}
test("create calculates totals and reserves inventory", async (t) => {
  const { input } = setup(t);
  const result = await createOrderForAdmin(input, "Bearer test");
  assert.equal(result.final_amount, 190);
  assert.equal(result.recipient_name, "Test");
  assert.equal(result.status, "pending");
  assert.equal(stockCalls[0][0], "reserve");
});
test("bank and sepay orders start unpaid", async (t) => {
  const { input } = setup(t);
  for (const payment_method of ["bank", "sepay"])
    assert.equal(
      (await createOrderForAdmin({ ...input, payment_method })).status,
      "unpaid",
    );
});
test("create rejects mismatched, inactive and non-customer accounts before reserving stock", async (t) => {
  const { input } = setup(t);
  for (const customer of [
    { account_id: "other", role_name: "customer", status: "active" },
    { account_id: "a", role_name: "customer", status: "inactive" },
    { account_id: "a", role_name: "staff", status: "active" },
  ]) {
    globalThis.fetch.mock.mockImplementation(async () => ({
      ok: true, json: async () => ({ data: customer }),
    }));
    await assert.rejects(createOrderForAdmin(input), /khách hàng đang hoạt động/);
  }
  assert.equal(stockCalls.length, 0);
  assert.equal(OrderModel.createOrder.mock.callCount(), 0);
});

test("failed stock reservation never writes an order", async (t) => {
  const { input } = setup(t);
  failReserve = true;
  await assert.rejects(createOrderForAdmin(input), /stock failed/);
  assert.equal(OrderModel.createOrder.mock.callCount(), 0);
});
test("create rejects invalid phone, duplicate items, insufficient stock and excessive discount", async (t) => {
  const { input } = setup(t);
  for (const change of [
    { recipient_phone: "123" },
    { order_items: [input.order_items[0], input.order_items[0]] },
    { order_items: [{ variant_id: "v", quantity: 11 }] },
    { total_discount_price: 201 },
  ])
    await assert.rejects(createOrderForAdmin({ ...input, ...change }));
  assert.equal(stockCalls.length, 0);
});
test("failed create cleans up order and restores inventory", async (t) => {
  const { input } = setup(t);
  t.mock.method(OrderModel, "createOrderItems", async () => {
    throw new Error("write failed");
  });
  await assert.rejects(createOrderForAdmin(input), /write failed/);
  assert.equal(OrderModel.deleteIncompleteOrder.mock.callCount(), 1);
  assert.equal(stockCalls[1][0], "restore");
});
test("update checks role and stale revision", async (t) => {
  setup(t);
  await assert.rejects(updateOrderForAdmin("o", {}, "customer"), {
    status: 403,
  });
  await assert.rejects(
    updateOrderForAdmin("o", { recipient_name: "X" }, "staff"),
    { status: 403 },
  );
  await assert.rejects(
    updateOrderForAdmin("o", { updated_at: "old" }, "admin"),
    { status: 409 },
  );
});
test("update recalculates total and reserves only extra quantity", async (t) => {
  const { writes } = setup(t);
  await updateOrderForAdmin(
    "o",
    {
      updated_at: "v1",
      order_items: [{ order_item_id: "i", quantity: 3, unit_price: 120 }],
    },
    "admin",
  );
  assert.equal(writes[0].final_amount, 370);
  assert.deepEqual(stockCalls, [
    ["reserve", [{ variant_id: "v", quantity: 1 }]],
  ]);
});
test("cancellation restores inventory, including staff status updates", async (t) => {
  setup(t);
  await updateOrderForAdmin(
    "o",
    { updated_at: "v1", status: "cancelled" },
    "staff",
  );
  assert.deepEqual(stockCalls, [
    ["restore", [{ variant_id: "v", quantity: 2 }]],
  ]);
});
test("failed reserve rolls back order update", async (t) => {
  const { writes } = setup(t);
  failReserve = true;
  await assert.rejects(
    updateOrderForAdmin(
      "o",
      {
        updated_at: "v1",
        order_items: [{ order_item_id: "i", quantity: 3, unit_price: 100 }],
      },
      "admin",
    ),
    /stock failed/,
  );
  assert.equal(writes.length, 2);
  assert.equal(writes[1].total_original_price, 200);
});
test("detail returns order items and payment information", async (t) => {
  setup(t);
  const result = await getOrderByIdForAdmin("o");
  assert.equal(result.order_items.length, 1);
  assert.ok(result.payment);
});

import test, { mock } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_ACCESS_SECRET = "test";
process.env.JWT_REFRESH_SECRET = "test";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_KEY = "test";

const requested = [];
mock.module("../src/configs/rabbitmq.js", {
  namedExports: {
    requestProductDetails: async (payload, queue) => {
      assert.equal(queue, "rpc_customer_profile_queue");
      requested.push(payload.account_id);
      if (payload.account_id === "missing") return null;
      if (payload.account_id === "mismatch") return { account_id: "other" };
      return {
        account_id: payload.account_id,
        avatar_url: `${payload.account_id}.png`,
        email: `${payload.account_id}@example.com`,
      };
    },
    sendOrderNotificationEvent: async () => {},
  },
});
const { OrderModel } = await import("../src/models/order.model.js");
const { getAllOrdersForAdmin } = await import("../src/services/order.service.js");

test("customer avatar and email join by ordering account, with deduplication and safe missing profiles", async (t) => {
  const ids = ["b", "a", "b", "missing", "mismatch", null, "off-page"];
  t.mock.method(OrderModel, "findAllForAdmin", async () => ids.map((account_id, index) => ({
    order_id: String(index), account_id, recipient_name: "Same recipient",
    recipient_phone: "0901234567", order_items: [],
  })));
  const { orders } = await getAllOrdersForAdmin({ limit: 6 });
  assert.deepEqual(requested.sort(), ["a", "b", "mismatch", "missing"]);
  assert.deepEqual(orders[0].customer, { avatar_url: "b.png", email: "b@example.com" });
  assert.equal(orders[1].customer.email, "a@example.com");
  assert.deepEqual(orders[2].customer, orders[0].customer);
  for (const order of orders.slice(3)) assert.equal(order.customer, null);
});

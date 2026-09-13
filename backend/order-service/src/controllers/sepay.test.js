import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

let calls = [];
globalThis.__sepayTest = {
  config: { sepayWebhookApiKey: "test-key", sepayAccountNumber: "123456" },
  service: {
    confirmSePayPayment: async (payload) => {
      calls.push(payload);
    },
  },
};
let source = await readFile(
  new URL("./order.controller.js", import.meta.url),
  "utf8",
);
source = source
  .replace(
    /import \* as orderService from [^;]+;/,
    "const orderService = globalThis.__sepayTest.service;",
  )
  .replace(
    /import \{ config \} from [^;]+;/,
    "const config = globalThis.__sepayTest.config;",
  );
const { handleSePayWebhook } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

async function deliver(body, authorization = "Apikey test-key") {
  calls = [];
  const response = {
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await handleSePayWebhook({ body, get: () => authorization }, response);
  return response;
}
const payload = {
  accountNumber: "123456",
  transferType: "in",
  transferAmount: 100000,
  content: "CT HD1740751234567ABC123",
};

test("SePay incoming payload matches uppercase bank transfer content", async () => {
  const response = await deliver(payload);
  assert.equal(response.code, 200);
  assert.deepEqual(response.body, { success: true });
  assert.deepEqual(calls, [
    { orderCode: "HD1740751234567ABC123", transferAmount: 100000 },
  ]);
});
test("unauthenticated webhook cannot update an order", async () => {
  assert.equal((await deliver(payload, "")).code, 401);
  assert.equal(calls.length, 0);
});
test("outgoing or wrong-account transactions do not update orders", async () => {
  for (const body of [
    { ...payload, transferType: "out" },
    { ...payload, accountNumber: "other" },
  ]) {
    assert.equal((await deliver(body)).code, 200);
    assert.equal(calls.length, 0);
  }
});

import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const { parsed = {} } = dotenv.config({
  path: fileURLToPath(new URL("../backend/order-service/.env", import.meta.url)),
  quiet: true,
});
const key = process.env.SEPAY_WEBHOOK_API_KEY || parsed.SEPAY_WEBHOOK_API_KEY;
const base = process.env.SEPAY_PUBLIC_URL || "https://startup-marathon-dense.ngrok-free.dev";
if (!key) {
  console.error("Missing SEPAY_WEBHOOK_API_KEY in backend/order-service/.env");
  process.exit(1);
}
// Outgoing transfer with no order code: never marks an order as paid.
const body = JSON.stringify({ transferType: "out", transferAmount: 0 });
let failed = false;
for (const origin of ["http://127.0.0.1:8000", base]) {
  try {
    const url = `${origin}/api/orders/sepay-webhook`;
    const send = (authorization) => fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authorization },
      body,
      signal: AbortSignal.timeout(15000),
    });
    const unauthorized = await send("Apikey invalid-diagnostic-key");
    if (unauthorized.status !== 401) throw new Error(`Invalid key: expected 401, got ${unauthorized.status}`);
    const authorized = await send(`Apikey ${key}`);
    if (authorized.status !== 200 || (await authorized.json()).success !== true)
      throw new Error(`Authorized webhook failed (HTTP ${authorized.status})`);
    console.log(`OK ${url}: rejects invalid key; accepts authenticated webhook.`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${origin}: ${error.message}`);
  }
}
console.log("This checks connectivity/authentication only. Replay the real transfer in SePay to verify order reconciliation.");
if (failed) process.exitCode = 1;

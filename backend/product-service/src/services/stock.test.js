import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./stock.service.js", import.meta.url), "utf8");
let stocks;
globalThis.__stockTestDb = {
  from(table) {
    assert.equal(table, "product_variants");
    const filters = {};
    let update;
    return {
      select() { return this; },
      eq(key, value) { filters[key] = value; return this; },
      update(value) { update = value; return this; },
      async single() {
        return { data: { stock_quantity: stocks[filters.variant_id] } };
      },
      async maybeSingle() {
        if (stocks[filters.variant_id] !== filters.stock_quantity) return { data: null };
        stocks[filters.variant_id] = update.stock_quantity;
        return { data: { variant_id: filters.variant_id } };
      },
    };
  },
};
const code = source.replace('import { supabase } from "../configs/supabase.js";', 'const supabase = globalThis.__stockTestDb;');
const { reserveStock, restoreStock } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("only the ordered size/color variant is deducted", async () => {
  stocks = { redS: 4, redM: 7, blueS: 9 };
  await reserveStock([{ variant_id: "redS", quantity: 2 }]);
  assert.deepEqual(stocks, { redS: 2, redM: 7, blueS: 9 });
});

test("two concurrent orders cannot oversell the same variant", async () => {
  stocks = { redS: 3 };
  const results = await Promise.allSettled([
    reserveStock([{ variant_id: "redS", quantity: 2 }]),
    reserveStock([{ variant_id: "redS", quantity: 2 }]),
  ]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(stocks.redS, 1);
});

test("failure on a later variant restores earlier reservations", async () => {
  stocks = { redS: 3, blueS: 0 };
  await assert.rejects(reserveStock([{ variant_id: "redS", quantity: 2 }, { variant_id: "blueS", quantity: 1 }]));
  assert.deepEqual(stocks, { redS: 3, blueS: 0 });
});

test("restoring an unsuccessful order preserves other purchases", async () => {
  stocks = { redS: 5 };
  await reserveStock([{ variant_id: "redS", quantity: 2 }]);
  await reserveStock([{ variant_id: "redS", quantity: 1 }]);
  await restoreStock([{ variant_id: "redS", quantity: 2 }]);
  assert.equal(stocks.redS, 4);
});

test("invalid quantity never changes stock", async () => {
  stocks = { redS: 5 };
  for (const quantity of [0, -1, 1.5]) {
    await assert.rejects(reserveStock([{ variant_id: "redS", quantity }]));
  }
  assert.equal(stocks.redS, 5);
});

import test from "node:test";
import assert from "node:assert/strict";
process.env.JWT_ACCESS_SECRET = "isolated-product-create-tests";
process.env.JWT_REFRESH_SECRET = "isolated-refresh-tests";
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_KEY = "test";
const { ProductModel } = await import("../src/models/product.model.js");
const { CategoryModel } = await import("../src/models/category.model.js");
const { BrandModel } = await import("../src/models/brand.model.js");
const { createProductWithVariants } = await import("../src/services/product.service.js");
const { default: express } = await import("express");
const { default: jwt } = await import("jsonwebtoken");
const { default: routes } = await import("../src/routes/product.routes.js");
const { errorHandler } = await import("../src/middlewares/error.middleware.js");
const { supabase } = await import("../src/configs/supabase.js");
const { buildProductFormData } = await import("../../../frontend/src/pages/Admin/Products/pages/productFormData.js");

function setup(t) {
  const writes = [];
  t.mock.method(CategoryModel, "getCategoryById", async () => ({ status: "active" }));
  t.mock.method(BrandModel, "ensureDefaultBrand", async () => "selene-default");
  t.mock.method(ProductModel, "uploadMultipleFilesToStorage", async (files) => {
    writes.push("upload");
    return files.map((_, i) => `image-${i}`);
  });
  t.mock.method(ProductModel, "createProduct", async (data) => { writes.push("product"); return data; });
  t.mock.method(ProductModel, "createVariants", async (data) => { writes.push("variants"); return data; });
  t.mock.method(ProductModel, "deleteCreatedProduct", async (id) => { writes.push(["delete-product", id]); });
  t.mock.method(ProductModel, "deleteFilesFromStorage", async (urls) => { writes.push(["delete-images", urls]); });
  const input = {
    product_name: " Áo thử nghiệm ", description: "Mô tả tiếng Việt\nDòng thứ hai",
    category_id: "category", price: "450000", original_price: "200000", discount_price: "400000",
    status: "active", variants: JSON.stringify([
      { size: " M ", color: " Đỏ ", stock_quantity: "3", status: "active" },
      { size: "L", color: "Đen", stock_quantity: "0", status: "inactive" },
    ]), image_order: JSON.stringify([{ upload: 1 }, { upload: 0 }]),
  };
  const files = [0, 1].map(() => ({ mimetype: "image/png", size: 100 }));
  return { input, files, writes };
}

test("persists all fields, numbers, trimmed variants and explicit image order", async (t) => {
  const { input, files } = setup(t);
  const saved = await createProductWithVariants(input, files);
  assert.equal(saved.product_name, "Áo thử nghiệm");
  for (const key of ["description", "category_id", "status"]) assert.equal(saved[key], input[key]);
  for (const key of ["price", "original_price", "discount_price"]) assert.equal(saved[key], Number(input[key]));
  assert.equal(saved.brand_id, "selene-default");
  assert.deepEqual(saved.image_urls, ["image-1", "image-0"]);
  assert.equal(saved.variants[0].size, "M");
  assert.equal(saved.variants[0].color, "Đỏ");
  assert.equal(saved.variants[0].stock_quantity, 3);
  assert.equal(saved.variants[1].status, "inactive");
  assert.ok(saved.variants.every((v) => v.product_id === saved.product_id && v.variant_id.length <= 100));
});

const invalidCases = [
  ["blank name", (i) => i.product_name = " "],
  ["non-string name", (i) => i.product_name = {}],
  ["long name", (i) => i.product_name = "a".repeat(121)],
  ["negative price", (i) => i.price = -1],
  ["blank price", (i) => i.original_price = ""],
  ["NaN price", (i) => i.price = "NaN"],
  ["boolean price", (i) => i.price = true],
  ["discount above price", (i) => i.discount_price = 500000],
  ["missing category", (i) => delete i.category_id],
  ["invalid status", (i) => i.status = "unknown"],
  ["malformed variants", (i) => i.variants = "{"],
  ["empty variants", (i) => i.variants = "[]"],
  ["null variant", (i) => i.variants = "[null]"],
  ["duplicate image order", (i) => i.image_order = '[{"upload":0},{"upload":0}]'],
  ["foreign image", (i) => i.old_image_urls = '["foreign"]'],
  ["missing images", (_, f) => f.splice(0)],
  ["too many images", (_, f) => f.push(...Array(10).fill(f[0]))],
  ["large file", (_, f) => f[0].size = 5 * 1024 * 1024 + 1],
  ["non-image file", (_, f) => f[0].mimetype = "text/plain"],
];
for (const [name, change] of invalidCases) {
  test(`rejects ${name} before uploads and inserts`, async (t) => {
    const { input, files, writes } = setup(t);
    change(input, files);
    await assert.rejects(createProductWithVariants(input, files), { status: 400 });
    assert.deepEqual(writes, []);
  });
}
for (const [name, change] of [
  ["fractional stock", (v) => v[0].stock_quantity = 1.5],
  ["overflow stock", (v) => v[0].stock_quantity = 2147483648],
  ["negative stock", (v) => v[0].stock_quantity = -1],
  ["missing stock", (v) => delete v[0].stock_quantity],
  ["blank color", (v) => v[0].color = " "],
  ["long size", (v) => v[0].size = "a".repeat(51)],
  ["invalid variant status", (v) => v[0].status = "wrong"],
  ["duplicate variant", (v) => v.push({ ...v[0], size: "m", color: "đỏ" })],
  ["supplied existing SKU", (v) => v[0].variant_id = "existing"],
]) {
  test(`rejects ${name}`, async (t) => {
    const { input, files, writes } = setup(t);
    const variants = JSON.parse(input.variants); change(variants); input.variants = JSON.stringify(variants);
    await assert.rejects(createProductWithVariants(input, files), { status: 400 });
    assert.deepEqual(writes, []);
  });
}
test("blank discount defaults to price and zero stock becomes out_of_stock", async (t) => {
  const { input, files } = setup(t);
  input.discount_price = "";
  input.variants = JSON.stringify([{ size: "M", color: "Red", stock_quantity: 0, status: "active" }]);
  const saved = await createProductWithVariants(input, files);
  assert.equal(saved.discount_price, saved.price);
  assert.equal(saved.variants[0].status, "out_of_stock");
});
test("rejects nonexistent category before upload", async (t) => {
  const { input, files, writes } = setup(t);
  t.mock.method(CategoryModel, "getCategoryById", async () => null);
  await assert.rejects(createProductWithVariants(input, files), { status: 400 });
  assert.deepEqual(writes, []);
});
for (const stage of ["createProduct", "createVariants"]) {
  test(`compensates failed ${stage}`, async (t) => {
    const { input, files, writes } = setup(t);
    t.mock.method(ProductModel, stage, async () => { throw new Error("DB failure"); });
    await assert.rejects(createProductWithVariants(input, files), /DB failure/);
    assert.equal(writes.some((w) => w[0] === "delete-product"), stage === "createVariants");
    assert.deepEqual(writes.at(-1), ["delete-images", ["image-0", "image-1"]]);
  });
}

test("HTTP multipart route enforces permissions, saves data, and returns validation errors", async (t) => {
  const { input, writes } = setup(t);
  const realFetch = globalThis.fetch;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (String(url).endsWith("/session/access")) {
      const claims = jwt.verify(options.headers.Authorization.slice(7), process.env.JWT_ACCESS_SECRET);
      return Response.json({ data: { accountId: "test-admin", role_id: 1, role: "admin", permissions: claims.permissions } });
    }
    return realFetch(url, options);
  });
  const app = express(); app.use(routes); app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/manage/product/add`;
  const token = (permissions) => jwt.sign({ role: "admin", permissions }, process.env.JWT_ACCESS_SECRET);
  const body = (overrides = {}, count = 2) => {
    const data = new FormData();
    for (const [key, value] of Object.entries({ ...input, ...overrides })) data.append(key, value);
    for (let i = 0; i < count; i++) data.append("images", new Blob(["image"], { type: "image/png" }), `${i}.png`);
    return data;
  };
  assert.equal((await fetch(url, { method: "POST", body: body() })).status, 401);
  assert.equal((await fetch(url, { method: "POST", body: body(), headers: { Authorization: `Bearer ${token([])}` } })).status, 403);
  assert.deepEqual(writes, []);
  const headers = { Authorization: `Bearer ${token(["product:create"])}` };
  const res = await fetch(url, { method: "POST", body: body(), headers });
  assert.equal(res.status, 201);
  const saved = (await res.json()).data;
  assert.equal(saved.description.replace(/\r\n/g, "\n"), input.description);
  assert.equal(saved.variants.length, 2);
  const bad = await fetch(url, { method: "POST", body: body({ price: "-1" }), headers });
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).message, /Giá/);
  const tooMany = await fetch(url, { method: "POST", body: body({}, 11), headers });
  assert.equal(tooMany.status, 400);
  assert.match((await tooMany.json()).message, /10 ảnh/);
});

test("frontend payload preserves every field and gives duplicate uploads distinct indexes", async () => {
  const image = "data:image/png;base64,aW1hZ2U=";
  const data = await buildProductFormData({
    form: { name: " Áo ", description: "Mô tả", basePrice: "100", originalPrice: "80", discount: "" },
    category: "c", status: "active", mainImg: image, thumbs: [image],
    variants: [{ size: " M ", color: " Đỏ ", stock_quantity: "2", status: "active" }],
  });
  assert.equal(data.get("product_name"), "Áo");
  assert.equal(data.get("description"), "Mô tả");
  assert.equal(data.get("price"), "100");
  assert.equal(data.get("original_price"), "80");
  assert.equal(data.get("discount_price"), "100");
  assert.equal(data.get("category_id"), "c");
  assert.equal(data.get("status"), "active");
  assert.equal(data.has("brand_id"), false);
  assert.deepEqual(JSON.parse(data.get("image_order")), [{ upload: 0 }, { upload: 1 }]);
  assert.equal(data.getAll("images").length, 2);
  assert.deepEqual(JSON.parse(data.get("variants")), [{ size: "M", color: "Đỏ", stock_quantity: 2, status: "active" }]);
});

test("failed parallel upload cleans successful siblings after all uploads settle", async (t) => {
  const deleted = [];
  t.mock.method(supabase.storage, "from", () => ({
    upload: async (_, buffer) => {
      if (buffer === "bad") return { error: new Error("upload failed") };
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { data: {} };
    },
    getPublicUrl: (path) => ({ data: { publicUrl: `https://storage/${path}` } }),
  }));
  t.mock.method(ProductModel, "deleteFilesFromStorage", async (urls) => deleted.push(...urls));
  await assert.rejects(ProductModel.uploadMultipleFilesToStorage([
    { originalname: "a.png", buffer: "good", mimetype: "image/png" },
    { originalname: "b.png", buffer: "bad", mimetype: "image/png" },
  ]), /upload failed/);
  assert.equal(deleted.length, 1);
});

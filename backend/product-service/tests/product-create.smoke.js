// Opt-in: creates an inactive temporary product in the configured DB and removes it.
// Uses the real routes and storage with an isolated local HTTP server/test JWT secret.
import assert from "node:assert/strict";
import { buildProductFormData } from "../../../frontend/src/pages/Admin/Products/pages/productFormData.js";
if (process.env.RUN_PRODUCT_DB_SMOKE !== "1") {
  console.log("Set RUN_PRODUCT_DB_SMOKE=1 to run the database smoke test.");
  process.exit(0);
}
process.env.JWT_ACCESS_SECRET = "isolated-smoke-secret-never-used-on-live-server";
const { default: express } = await import("express");
const { default: jwt } = await import("jsonwebtoken");
const { default: routes } = await import("../src/routes/product.routes.js");
const { errorHandler } = await import("../src/middlewares/error.middleware.js");
const { ProductModel } = await import("../src/models/product.model.js");
const { supabase } = await import("../src/configs/supabase.js");
const app = express(); app.use(routes); app.use(errorHandler);
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const token = jwt.sign({ role: "admin", permissions: ["product:create", "product:view", "product:update"] }, process.env.JWT_ACCESS_SECRET, { expiresIn: "5m" });
const headers = { Authorization: `Bearer ${token}` };
const marker = `__product_smoke_${Date.now()}`;
let saved;
let originalUrls = [];
try {
  const { data: categories, error } = await supabase.from("categories").select("category_id").eq("status", "active").limit(1);
  if (error) throw error;
  assert.ok(categories.length, "An active category is required");
  const input = {
    product_name: marker, description: "Mô tả thử nghiệm tiếng Việt\nDòng 2",
    category_id: categories[0].category_id, price: "450000", original_price: "200000",
    discount_price: "400000", status: "inactive",
    variants: JSON.stringify([
      { size: " M ", color: " Đỏ ", stock_quantity: 3, status: "active" },
      { size: "L", color: "Đen", stock_quantity: 0, status: "inactive" },
      { size: "XL", color: "Trắng", stock_quantity: 0, status: "active" },
    ]), image_order: JSON.stringify([{ upload: 1 }, { upload: 0 }]),
  };
  const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
  const form = await buildProductFormData({
    form: { name: input.product_name, description: input.description, basePrice: input.price,
      originalPrice: input.original_price, discount: input.discount_price },
    category: input.category_id, variants: JSON.parse(input.variants),
    mainImg: image, thumbs: [image], status: input.status,
  });
  const response = await fetch(`${base}/manage/product/add`, { method: "POST", headers, body: form });
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  saved = body.data;
  originalUrls = saved.image_urls;
  assert.equal(saved.brand_id, "selene-default");
  const detailResponse = await fetch(`${base}/manage/product-detail/${saved.product_id}`, { headers });
  assert.equal(detailResponse.status, 200);
  const detail = (await detailResponse.json()).data;
  for (const key of ["product_name", "category_id", "status"]) assert.equal(detail[key], input[key]);
  assert.equal(detail.description.replace(/\r\n/g, "\n"), input.description);
  for (const key of ["price", "original_price", "discount_price"]) assert.equal(detail[key], Number(input[key]));
  assert.deepEqual(detail.image_urls, saved.image_urls);
  assert.equal(detail.variants.length, 3);
  assert.equal(detail.variants.find((v) => v.size === "M").color, "Đỏ");
  assert.equal(detail.variants.find((v) => v.size === "M").stock_quantity, 3);
  assert.equal(detail.variants.find((v) => v.size === "L").status, "inactive");
  assert.equal(detail.variants.find((v) => v.size === "XL").status, "out_of_stock");
  const listResponse = await fetch(`${base}/manage/products?q=${encodeURIComponent(marker)}`, { headers });
  assert.equal(listResponse.status, 200);
  const listed = (await listResponse.json()).data.products.find((p) => p.product_id === saved.product_id);
  assert.ok(listed);
  assert.equal(listed.stock_quantity, 3);
  assert.equal(listed.image_url, saved.image_urls[0]);
  for (const url of detail.image_urls) assert.equal((await fetch(url)).status, 200);
  // Verify a newly created no-brand form product can subsequently be edited.
  const edit = new FormData();
  for (const [key, value] of Object.entries({ ...input, product_name: `${marker}_edited`,
    variants: JSON.stringify(detail.variants), old_image_urls: JSON.stringify(detail.image_urls),
    image_order: JSON.stringify(detail.image_urls.map((url) => ({ url }))),
  })) edit.append(key, value);
  const updated = await fetch(`${base}/manage/product/update/${saved.product_id}`, { method: "PUT", headers, body: edit });
  const updatedBody = await updated.json();
  assert.equal(updated.status, 200, JSON.stringify(updatedBody));
  assert.equal(updatedBody.data.product_name, `${marker}_edited`);
  assert.equal(updatedBody.data.brand_id, "selene-default");
  console.log("PASS: real multipart create → DB detail → public images → edit; all fields and variants verified.");
} finally {
  try {
    if (saved) {
      // Limit cleanup to this run's exact ID, after checking the unique name marker.
      const current = await ProductModel.getProductById(saved.product_id);
      assert.ok(current.product_name.startsWith(marker));
      await ProductModel.deleteCreatedProduct(saved.product_id);
      await ProductModel.deleteFilesFromStorage(originalUrls);
      assert.equal(await ProductModel.getProductById(saved.product_id), null);
      const { data: remaining, error: remainingError } = await supabase.from("product_variants")
        .select("variant_id").eq("product_id", saved.product_id);
      if (remainingError) throw remainingError;
      assert.equal(remaining.length, 0);
      for (const url of originalUrls) {
        const filename = url.split("/").at(-1);
        const { data, error } = await supabase.storage.from("products").list("products", { search: filename });
        if (error) throw error;
        assert.ok(!data.some((file) => file.name === filename));
      }
      console.log("PASS: temporary product, variants and images cleaned up.");
    }
  } finally {
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
  }
}

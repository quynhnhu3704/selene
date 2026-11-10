import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import multer from "multer";

process.env.JWT_ACCESS_SECRET ||= "test";
process.env.JWT_REFRESH_SECRET ||= "test";
process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_KEY ||= "test";
const { CategoryModel } = await import("../src/models/category.model.js");
const { ProductModel } = await import("../src/models/product.model.js");
const controller = await import("../src/controllers/category.controller.js");
const { errorHandler } = await import("../src/middlewares/error.middleware.js");

async function setup(t) {
  let category = { category_id: "15", name: "Cũ", description: "Mô tả", image_url: "old-image" };
  const deleted = [];
  t.mock.method(CategoryModel, "getCategoryById", async (id) => id === "15" ? category : null);
  t.mock.method(CategoryModel, "checkNameExists", async (name) => name === "Trùng");
  t.mock.method(CategoryModel, "checkNameExistsForUpdate", async (name) => name === "Trùng");
  t.mock.method(CategoryModel, "create", async (data) => data);
  t.mock.method(CategoryModel, "update", async (_, data) => (category = { ...category, ...data }));
  t.mock.method(ProductModel, "uploadMultipleFilesToStorage", async () => ["new-image"]);
  t.mock.method(ProductModel, "deleteFilesFromStorage", async (urls) => deleted.push(...urls));
  const app = express();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
  app.get("/categories/:categoryId", controller.handleGetCategoryDetail);
  app.post("/categories", upload.single("image"), controller.handleCreateCategory);
  app.put("/categories/:categoryId", upload.single("image"), controller.handleUpdateCategory);
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const request = async (method, path, fields = {}, file) => {
    const body = new FormData();
    for (const [key, value] of Object.entries(fields)) body.append(key, value);
    if (file) body.append("image", new Blob([file.data || "image"], { type: file.type || "image/png" }), "image.png");
    const res = await fetch(`http://127.0.0.1:${server.address().port}/categories${path}`, {
      method, ...(method !== "GET" && { body }),
    });
    return { status: res.status, body: await res.json() };
  };
  return { request, deleted };
}

test("detail returns existing category and 404 for missing category", async (t) => {
  const { request } = await setup(t);
  assert.equal((await request("GET", "/15")).body.data.name, "Cũ");
  assert.equal((await request("GET", "/missing")).status, 404);
});

test("create supports optional image and trims category name", async (t) => {
  const { request } = await setup(t);
  for (const file of [undefined, { type: "image/png" }]) {
    const res = await request("POST", "", { name: " Mới ", description: "Mô tả" }, file);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.name, "Mới");
    assert.equal(res.body.data.image_url, file ? "new-image" : undefined);
  }
});

test("create/update reject blank, duplicate, long names and invalid status", async (t) => {
  const { request } = await setup(t);
  for (const [method, path] of [["POST", ""], ["PUT", "/15"]]) {
    for (const fields of [{ name: " " }, { name: "Trùng" }, { name: "a".repeat(81) }, { name: "Mới", status: "invalid" }]) {
      assert.equal((await request(method, path, fields)).status, 400);
    }
  }
});

test("update retains existing image, clears description and replaces image", async (t) => {
  const { request, deleted } = await setup(t);
  let res = await request("PUT", "/15", { name: "Mới", description: "" });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.description, "");
  assert.equal(res.body.data.image_url, "old-image");
  assert.deepEqual(deleted, []);
  res = await request("PUT", "/15", { name: "Mới" }, { type: "image/webp" });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.image_url, "new-image");
  assert.deepEqual(deleted, ["old-image"]);
});

test("update missing category returns 404 before uploading", async (t) => {
  const { request } = await setup(t);
  assert.equal((await request("PUT", "/missing", { name: "Mới" }, {})).status, 404);
  assert.equal(ProductModel.uploadMultipleFilesToStorage.mock.callCount(), 0);
});

test("create/update reject unsupported and oversized images", async (t) => {
  const { request } = await setup(t);
  for (const [method, path] of [["POST", ""], ["PUT", "/15"]]) {
    for (const file of [{ type: "text/plain" }, { data: new Uint8Array(5 * 1024 * 1024 + 1) }]) {
      assert.equal((await request(method, path, { name: "Mới" }, file)).status, 400);
    }
  }
  assert.equal(ProductModel.uploadMultipleFilesToStorage.mock.callCount(), 0);
});

test("failed database writes clean up the newly uploaded image", async (t) => {
  const { request, deleted } = await setup(t);
  for (const [method, path, modelMethod] of [["POST", "", "create"], ["PUT", "/15", "update"]]) {
    t.mock.method(CategoryModel, modelMethod, async () => { throw new Error("Database unavailable"); });
    assert.equal((await request(method, path, { name: "Mới" }, {})).status, 500);
  }
  assert.deepEqual(deleted, ["new-image", "new-image"]);
});

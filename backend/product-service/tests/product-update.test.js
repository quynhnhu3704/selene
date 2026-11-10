import test from "node:test";
import assert from "node:assert/strict";
process.env.JWT_ACCESS_SECRET ||= "test";
process.env.JWT_REFRESH_SECRET ||= "test";
process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_KEY ||= "test";
const { ProductModel } = await import("../src/models/product.model.js");
const { BrandModel } = await import("../src/models/brand.model.js");
const { CategoryModel } = await import("../src/models/category.model.js");
const { updateProductWithVariants, createProductWithVariants } =
  await import("../src/services/product.service.js");

function setup(t) {
  const calls = [];
  const product = {
    product_id: "p",
    category_id: "c",
    brand_id: "b",
    product_name: "Old",
    price: 100,
    original_price: 120,
    discount_price: 90,
    description: "Old description",
    status: "active",
    image_urls: JSON.stringify(["old-main", "old-thumb"]),
    updated_at: "old-time",
    product_variants: [
      {
        variant_id: "v",
        size: "M",
        color: "Blue",
        stock_quantity: 1,
        status: "active",
      },
    ],
  };
  t.mock.method(ProductModel, "getProductById", async () => product);
  t.mock.method(
    ProductModel,
    "getProductDetailWithVariants",
    async () => product,
  );
  t.mock.method(CategoryModel, "getCategoryById", async () => ({
    category_id: "c",
  }));
  t.mock.method(BrandModel, "getBrandNameById", async () => "Brand");
  t.mock.method(ProductModel, "uploadMultipleFilesToStorage", async (files) => {
    calls.push("upload");
    return files.map((_, i) => `new-${i}`);
  });
  t.mock.method(ProductModel, "updateProduct", async (_, data) => {
    calls.push("product");
    return data;
  });
  t.mock.method(ProductModel, "upsertVariants", async (data) => {
    calls.push("variants");
    return data;
  });
  t.mock.method(ProductModel, "deleteFilesFromStorage", async (urls) => {
    calls.push(["delete", urls]);
  });
  t.mock.method(
    ProductModel,
    "restoreProductAfterFailedUpdate",
    async (_, __, snapshot) => {
      calls.push(["restore", snapshot]);
      return true;
    },
  );
  const input = {
    category_id: "c",
    brand_id: "b",
    product_name: " Updated ",
    price: "150",
    original_price: "180",
    discount_price: "140",
    description: "New description",
    status: "active",
    variants: JSON.stringify(product.product_variants),
    old_image_urls: JSON.stringify(["old-thumb"]),
    image_order: JSON.stringify([{ upload: 0 }, { url: "old-thumb" }]),
  };
  const files = [{ mimetype: "image/png", size: 100 }];
  return { calls, input, files };
}

test("updates every editable field and keeps a new main image before an existing thumbnail", async (t) => {
  const { input, files, calls } = setup(t);
  const saved = await updateProductWithVariants("p", input, files);
  assert.deepEqual(saved.image_urls, ["new-0", "old-thumb"]);
  assert.equal(saved.product_name, "Updated");
  for (const key of ["price", "original_price", "discount_price"])
    assert.equal(saved[key], Number(input[key]));
  for (const key of ["category_id", "brand_id", "description", "status"])
    assert.equal(saved[key], input[key]);
  assert.deepEqual(calls.slice(-2), ["variants", ["delete", ["old-main"]]]);
});
for (const [name, change] of [
  ["negative price", (input) => (input.price = "-1")],
  ["invalid price", (input) => (input.discount_price = "abc")],
  [
    "negative stock",
    (input) =>
      (input.variants = JSON.stringify([
        {
          variant_id: "v",
          size: "M",
          color: "Blue",
          stock_quantity: -1,
          status: "active",
        },
      ])),
  ],
  [
    "foreign variant",
    (input) =>
      (input.variants = JSON.stringify([
        {
          variant_id: "other",
          size: "M",
          color: "Blue",
          stock_quantity: 1,
          status: "active",
        },
      ])),
  ],
  [
    "missing existing variant",
    (input) =>
      (input.variants = JSON.stringify([
        { size: "L", color: "Blue", stock_quantity: 1, status: "active" },
      ])),
  ],
  [
    "foreign image",
    (input) => (input.old_image_urls = JSON.stringify(["foreign"])),
  ],
  [
    "invalid image order",
    (input) =>
      (input.image_order = JSON.stringify([
        { upload: 2 },
        { url: "old-thumb" },
      ])),
  ],
  [
    "duplicate variant",
    (input) =>
      (input.variants = JSON.stringify([
        {
          variant_id: "v",
          size: "M",
          color: "Blue",
          stock_quantity: 1,
          status: "active",
        },
        { size: "m", color: " blue ", stock_quantity: 2, status: "active" },
      ])),
  ],
]) {
  test(`rejects ${name} before writes or uploads`, async (t) => {
    const { input, files, calls } = setup(t);
    change(input);
    await assert.rejects(updateProductWithVariants("p", input, files));
    assert.deepEqual(calls, []);
  });
}
test("keeps a locked zero-stock variant locked", async (t) => {
  const { input, files } = setup(t);
  input.variants = JSON.stringify([
    {
      variant_id: "v",
      size: "M",
      color: "Blue",
      stock_quantity: 0,
      status: "inactive",
    },
  ]);
  const saved = await updateProductWithVariants("p", input, files);
  assert.equal(saved.variants[0].status, "inactive");
});
test("restores the parent and removes only new uploads if variant save fails", async (t) => {
  const { input, files, calls } = setup(t);
  t.mock.method(ProductModel, "upsertVariants", async () => {
    throw new Error("database failure");
  });
  await assert.rejects(
    updateProductWithVariants("p", input, files),
    /database failure/,
  );
  const restore = calls.find(
    (call) => Array.isArray(call) && call[0] === "restore",
  );
  assert.equal(restore[1].product_name, "Old");
  assert.equal(restore[1].price, 100);
  assert.deepEqual(calls.at(-1), ["delete", ["new-0"]]);
  assert.ok(
    !calls.some(
      (call) =>
        Array.isArray(call) &&
        call[0] === "delete" &&
        call[1].includes("old-main"),
    ),
  );
});


test("create product without a brand uses an independent SKU", async (t) => {
  t.mock.method(CategoryModel, "getCategoryById", async () => ({ status: "active" }));
  t.mock.method(BrandModel, "ensureDefaultBrand", async () => "selene-default");
  t.mock.method(BrandModel, "getBrandNameById", async () => {
    assert.fail("Brand lookup must not run without a brand");
  });
  t.mock.method(ProductModel, "uploadMultipleFilesToStorage", async () => ["image"]);
  t.mock.method(ProductModel, "createProduct", async (data) => {
    assert.equal(data.brand_id, "selene-default");
    return data;
  });
  t.mock.method(ProductModel, "createVariants", async (data) => data);
  const result = await createProductWithVariants({
    category_id: "c", product_name: "New product", price: 100,
    original_price: 100, discount_price: 100,
    variants: JSON.stringify([{ size: "M", color: "Blue", stock_quantity: 2 }]),
  }, [{ mimetype: "image/png", size: 100 }]);
  assert.match(result.variants[0].variant_id, /^SELENE-/);
  assert.equal(result.variants[0].status, "active");
});

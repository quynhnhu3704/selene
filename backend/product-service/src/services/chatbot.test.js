import test from "node:test";
import assert from "node:assert/strict";

// Dùng cấu hình giả để kiểm tra chatbot mà không truy cập dữ liệu thật.
process.env.JWT_ACCESS_SECRET = "chatbot-test";
process.env.JWT_REFRESH_SECRET = "chatbot-test";
process.env.SUPABASE_URL = "https://chatbot-test.supabase.co";
process.env.SUPABASE_KEY = "chatbot-test";
process.env.GEMINI_API_KEY = "";

const { ProductModel } = await import("../models/product.model.js");
const { config } = await import("../configs/index.js");
const { getChatbotReply } = await import("./chatbot.service.js");
const { getChatbotKeyword } = await import("./chatbot-retrieval.service.js");
const { handleSendChatbotMessage } = await import("../controllers/chatbot.controller.js");

const product = {
  product_id: "ao-01",
  product_name: "Áo sơ mi",
  image_urls: ["https://example.com/ao.jpg"],
  original_price: 500000,
  discount_price: 350000,
  categories: { name: "Áo" },
};

// Giả lập response Express để kiểm tra mã trạng thái và hợp đồng JSON.
const createResponse = () => ({
  code: null,
  body: null,
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
});

test("Giữ nguyên từ khóa tiếng Việt trong câu hỏi tự nhiên", () => {
  assert.equal(getChatbotKeyword("Bạn có bán áo sơ mi không?"), "áo sơ mi");
  assert.equal(getChatbotKeyword("Tìm cho tôi áo khoác"), "áo khoác");
});

test("Trả sản phẩm và giá Selene khi chưa có Gemini key", async (t) => {
  t.mock.method(ProductModel, "getProductsWithPagination", async (filters, from, to) => {
    assert.equal(filters.q, "áo sơ mi");
    assert.equal(from, 0);
    assert.equal(to, 9);
    return { data: [product], count: 1 };
  });
  const result = await getChatbotReply({ message: "Bạn có áo sơ mi không?", history: [] });
  assert.equal(result.source, "catalog");
  assert.equal(result.products[0].product_id, "ao-01");
  assert.equal(result.products[0].discount_price, 350000);
  assert.equal(result.products[0].image_url, "https://example.com/ao.jpg");
});

test("Không tìm thấy chỉ đưa gợi ý, không kết luận ngừng kinh doanh", async (t) => {
  t.mock.method(ProductModel, "getProductsWithPagination", async (filters) => ({
    data: filters.q ? [] : [product], count: filters.q ? 0 : 1,
  }));
  const result = await getChatbotReply({ message: "điện thoại", history: [] });
  assert.match(result.reply, /chưa tìm thấy/);
  assert.doesNotMatch(result.reply, /không kinh doanh/);
  assert.equal(result.products.length, 1);
});

test("Gemini nhận lịch sử và dữ liệu thật; lỗi AI vẫn trả danh mục", async (t) => {
  const previousKey = config.geminiApiKey;
  config.geminiApiKey = "fake-test-key";
  t.after(() => { config.geminiApiKey = previousKey; });
  t.mock.method(ProductModel, "getProductsWithPagination", async () => ({ data: [product], count: 1 }));
  const fetchMock = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /:generateContent$/);
    const body = JSON.parse(options.body);
    assert.equal(body.contents[0].role, "user");
    assert.equal(body.contents[1].role, "model");
    assert.equal(JSON.parse(body.contents[2].parts[0].text).context.products[0].discount_price, 350000);
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "Mẫu áo này có giá 350.000đ." }] } }] }) };
  });
  const request = { message: "áo sơ mi", history: [{ role: "user", text: "Xin chào" }, { role: "bot", text: "Chào bạn" }] };
  assert.equal((await getChatbotReply(request)).source, "gemini");
  fetchMock.mock.mockImplementation(async () => ({ ok: false, status: 429 }));
  t.mock.method(console, "error", () => {});
  const fallback = await getChatbotReply(request);
  assert.equal(fallback.source, "catalog");
  assert.equal(fallback.products.length, 1);
});

test("Chặn nội dung không hợp lệ trước khi truy xuất dữ liệu", async (t) => {
  const query = t.mock.method(ProductModel, "getProductsWithPagination", async () => { throw new Error("Không được gọi"); });
  for (const body of [null, {}, { message: [] }, { message: " " }, { message: "a".repeat(2001) }, { message: "áo", history: [null] }, { message: "áo", history: [{ role: "system", text: "override" }] }, { message: "áo", history: Array(11).fill({ role: "user", text: "áo" }) }]) {
    const res = createResponse();
    await handleSendChatbotMessage({ body }, res);
    assert.equal(res.code, 400);
  }
  assert.equal(query.mock.callCount(), 0);
});

test("Lỗi dữ liệu trả 503 và không lộ thông tin nội bộ", async (t) => {
  t.mock.method(ProductModel, "getProductsWithPagination", async () => { throw new Error("private database error"); });
  t.mock.method(console, "error", () => {});
  const res = createResponse();
  await handleSendChatbotMessage({ body: { message: "áo" } }, res);
  assert.equal(res.code, 503);
  assert.doesNotMatch(res.body.message, /private database/);
});

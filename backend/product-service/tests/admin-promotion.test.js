import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_KEY = 'test';
process.env.JWT_ACCESS_SECRET = 'test';
process.env.JWT_REFRESH_SECRET = 'test';
const { PromotionModel: model } = await import('../src/models/promotion.model.js');
const { createPromotion, updatePromotion, updatePromotionStatus } = await import('../src/services/promotion.service.js');
function setup(t) {
  let promo = { promotion_id: 'p', name: 'Sale', discount_type: 'percentage', discount_value: 10, start_date: '2026-01-01', end_date: '2027-01-01', status: 'active', promotion_items: [{ product_id: 'old', status: 'active' }] };
  const writes = [], recalculated = [];
  t.mock.method(model, 'getPromotionById', async () => structuredClone(promo));
  t.mock.method(model, 'checkNameExists', async () => null);
  t.mock.method(model, 'checkNameExistsForUpdate', async () => null);
  t.mock.method(model, 'checkProductActivePromotionConflicts', async () => []);
  t.mock.method(model, 'checkProductsExist', async ids => ids.filter(id => id !== 'missing').map(product_id => ({ product_id })));
  t.mock.method(model, 'getAllActiveProductIds', async () => ['old', 'new']);
  t.mock.method(model, 'create', async data => { writes.push('create'); promo = { ...data, promotion_items: [] }; return data; });
  t.mock.method(model, 'update', async (_, data) => { writes.push('update'); Object.assign(promo, data); });
  t.mock.method(model, 'updateStatus', async (_, status) => { promo.status = status; return promo; });
  t.mock.method(model, 'deletePromotionItems', async () => { writes.push('delete'); promo.promotion_items = []; });
  t.mock.method(model, 'createPromotionItems', async items => { writes.push('items'); promo.promotion_items = items; return items; });
  t.mock.method(model, 'updatePromotionItemsStatus', async () => { throw new Error('Must preserve individual item state'); });
  t.mock.method(model, 'recalculateProductsDiscountPrice', async ids => recalculated.push(ids));
  return { writes, recalculated, get: () => promo };
}
test('removing products recalculates both removed and retained prices', async t => {
  const state = setup(t);
  await updatePromotion('p', { product_ids: ['new'] });
  assert.deepEqual(state.recalculated.at(-1).sort(), ['new', 'old']);
});
test('clearing products resets previous product prices', async t => {
  const state = setup(t);
  await updatePromotion('p', { product_ids: [] });
  assert.deepEqual(state.recalculated.at(-1), ['old']);
});
test('invalid product is rejected before modifying promotion', async t => {
  const state = setup(t);
  await assert.rejects(updatePromotion('p', { name: 'Changed', product_ids: ['missing'] }));
  assert.deepEqual(state.writes, []);
});
test('pause and resume preserve item eligibility', async t => {
  const state = setup(t);
  await updatePromotionStatus('p', 'inactive');
  await updatePromotionStatus('p', 'active');
  assert.equal(state.get().promotion_items[0].status, 'active');
});
test('all scope creates real product associations, including initially paused promotions', async t => {
  const state = setup(t);
  const result = await createPromotion({ ...state.get(), scope_type: 'all', status: 'inactive', product_ids: [] });
  assert.deepEqual(result.promotion_items.map(item => item.product_id), ['old', 'new']);
  assert.ok(result.promotion_items.every(item => item.status === 'active'));
});

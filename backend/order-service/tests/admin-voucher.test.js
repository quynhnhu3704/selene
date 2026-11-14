import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_KEY = 'test';
process.env.JWT_ACCESS_SECRET = 'test';
process.env.JWT_REFRESH_SECRET = 'test';
const { VoucherModel: model } = await import('../src/models/voucher.model.js');
const { VoucherService: service } = await import('../src/services/voucher.service.js');
const valid = { code: ' sale ', name: ' Sale ', discount_type: 'percentage', discount_value: 10, start_date: '2026-01-01', end_date: '2027-01-01' };
function setup(t) {
  const writes = [];
  t.mock.method(model, 'findByCode', async code => code === 'DUPLICATE' ? { voucher_id: 'other' } : null);
  t.mock.method(model, 'findById', async id => id === 'missing' ? null : { ...valid, voucher_id: id, used_quantity: 5 });
  t.mock.method(model, 'create', async data => { writes.push(data); return data; });
  t.mock.method(model, 'update', async (_, data) => { writes.push(data); return data; });
  return writes;
}
test('create normalizes fields and ignores client ids and usage counts', async t => {
  setup(t);
  const saved = await service.createVoucher({ ...valid, voucher_id: 'injected', used_quantity: 100 });
  assert.equal(saved.code, 'SALE');
  assert.equal(saved.used_quantity, 0);
  assert.notEqual(saved.voucher_id, 'injected');
});
test('invalid voucher values never reach database writes', async t => {
  const writes = setup(t);
  for (const overrides of [{ discount_value: 101 }, { end_date: 'invalid' }, { end_date: '2025-01-01' }, { total_quantity: -1 }, { total_quantity: 1.5 }, { discount_type: 'bad' }, { name: '' }]) {
    await assert.rejects(service.createVoucher({ ...valid, ...overrides }), { status: 400 });
  }
  assert.equal(writes.length, 0);
});
test('duplicate codes return conflict on create and update', async t => {
  const writes = setup(t);
  await assert.rejects(service.createVoucher({ ...valid, code: 'duplicate' }), { status: 409 });
  await assert.rejects(service.updateVoucher('v', { code: 'duplicate' }), { status: 409 });
  assert.equal(writes.length, 0);
});
test('partial update preserves fields and protects usage counter', async t => {
  setup(t);
  const saved = await service.updateVoucher('v', { name: 'Changed', used_quantity: 0 });
  assert.equal(saved.name, 'Changed');
  assert.equal(saved.discount_value, 10);
  assert.equal(saved.used_quantity, undefined);
});
test('missing voucher returns 404', async t => {
  setup(t);
  await assert.rejects(service.getVoucherById('missing'), { status: 404 });
  await assert.rejects(service.updateVoucher('missing', valid), { status: 404 });
});

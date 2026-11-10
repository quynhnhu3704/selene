import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
process.env.JWT_ACCESS_SECRET ||= "test";
process.env.JWT_REFRESH_SECRET ||= "test";
process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_KEY ||= "test";
const { UserProfileModel: model } = await import("../src/models/userProfile.model.js");
const { AccountModel } = await import("../src/models/account.model.js");
const service = await import("../src/services/user.service.js");
const { errorHandler } = await import("../src/middlewares/error.middleware.js");
const valid = { full_name: "Khách thử", email: "test@example.com", phone: "0912345678", identity_card: "012345678901", gender: "Nữ", dob: "2000-01-02", address: "Hà Nội" };
const avatar = { originalname: "avatar.png", mimetype: "image/png", buffer: Buffer.from("mock image") };
function setup(t) {
  for (const method of ["checkEmailExists", "checkPhoneExists"]) t.mock.method(model, method, async () => []);
  t.mock.method(model, "checkDuplicate", async () => null);
  t.mock.method(model, "findRoleByName", async name => ({ role_id: name === "customer" ? 3 : 2, name }));
  t.mock.method(model, "uploadAvatarFile", async () => "https://example.com/avatar.png");
  t.mock.method(model, "getProfileByAccountId", async () => ({ full_name: "Old", phone_number: "0987654321", avatar_url: "old.png" }));
  t.mock.method(model, "getAccountById", async () => ({ email: "old@example.com", role_id: 3 }));
  t.mock.method(AccountModel, "findById", async () => ({ role_id: 3 }));
  const writes = {};
  for (const method of ["insertAccount", "insertProfile", "updateProfileByAccountId"]) writes[method] = t.mock.method(model, method, async () => {});
  writes.accountUpdate = t.mock.method(AccountModel, "updateAccountById", async () => {});
  return writes;
}
test("create customer persists every field, avatar, role and hashed initial password", async t => {
  const writes = setup(t);
  const result = await service.createCustomer(valid, avatar);
  const account = writes.insertAccount.mock.calls[0].arguments[0];
  const profile = writes.insertProfile.mock.calls[0].arguments[0];
  assert.equal(account.role_id, 3);
  assert.equal(account.email, valid.email);
  assert.equal(account.phone, valid.phone);
  assert.ok(await bcrypt.compare(valid.phone, account.password));
  assert.equal(profile.account_id, result.accountId);
  for (const key of ["full_name", "identity_card", "gender", "dob", "address"]) assert.equal(profile[key], valid[key]);
  assert.equal(profile.phone_number, valid.phone);
  assert.equal(profile.avatar_url, "https://example.com/avatar.png");
});
test("update synchronizes account and profile and clears optional fields", async t => {
  const writes = setup(t);
  await service.updateProfileAll("a", valid, avatar, "admin");
  const profile = writes.updateProfileByAccountId.mock.calls[0].arguments[1];
  assert.equal(profile.phone_number, valid.phone);
  for (const key of ["full_name", "identity_card", "gender", "dob", "address"]) assert.equal(profile[key], valid[key]);
  assert.equal(profile.avatar_url, "https://example.com/avatar.png");
  assert.deepEqual(writes.accountUpdate.mock.calls[0].arguments, ["a", {email: valid.email, phone: valid.phone}]);
  const result = await service.updateProfileAll("a", {...valid, dob:"", gender:"", address:"", identity_card:""}, null, "admin");
  for (const key of ["dob", "gender", "address", "identity_card"]) assert.equal(result.profile[key], null);
  assert.equal(result.profile.avatar_url, "old.png");
});
test("create and update reject invalid fields before writing", async t => {
  const writes = setup(t);
  for (const invalid of [{full_name:" "}, {email:"bad"}, {phone:"123"}, {identity_card:"123"}, {gender:"invalid"}, {dob:"2024-02-30"}, {dob:"2999-01-01"}]) {
    await assert.rejects(service.createCustomer({...valid,...invalid}), e => e.status === 400);
    await assert.rejects(service.updateProfileAll("a", {...valid,...invalid}), e => e.status === 400);
  }
  assert.equal(writes.insertAccount.mock.callCount(), 0);
  assert.equal(writes.accountUpdate.mock.callCount(), 0);
});
test("duplicate email, phone and identity are rejected on create and update", async t => {
  setup(t);
  for (const method of ["checkEmailExists", "checkPhoneExists", "checkDuplicate"]) {
    const original = model[method];
    model[method] = async () => method === "checkDuplicate" ? {account_id:"other"} : [{account_id:"other"}];
    await assert.rejects(service.createCustomer(valid), /đã/);
    await assert.rejects(service.updateProfileAll("a", valid), /đã/);
    model[method] = original;
  }
});
test("invalid and oversized avatars are rejected without database writes", async t => {
  const writes = setup(t);
  for (const file of [{...avatar,mimetype:"text/html"}, {...avatar,buffer:Buffer.alloc(5*1024*1024+1)}]) {
    await assert.rejects(service.createCustomer(valid,file), e => e.status === 400);
    await assert.rejects(service.updateProfileAll("a",valid,file), e => e.status === 400);
  }
  assert.equal(writes.insertAccount.mock.callCount(),0);
  assert.equal(writes.accountUpdate.mock.callCount(),0);
  let status;
  errorHandler({code:"LIMIT_FILE_SIZE"}, {}, {status(value){status=value;return this;},json(body){assert.match(body.message,/5 MB/);}});
  assert.equal(status,400);
});
test("missing profile and invalid target account are rejected", async t => {
  setup(t);
  t.mock.method(model,"getProfileDetailById",async () => null);
  await assert.rejects(service.getProfileDetail("missing"), /Không tìm thấy/);
  t.mock.method(AccountModel,"findById",async () => ({role_id:1}));
  await assert.rejects(service.updateProfileAll("owner",valid,null,"other"), /Không tìm thấy/);
});

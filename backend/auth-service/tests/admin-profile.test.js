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
test("order customer lookup searches name, email and phone without calling order counts", async t => {
  t.mock.method(model, "getAdminProfiles", async () => [
    { profile_id: "p", account_id: "a", full_name: "Nguyễn Minh Tâm", phone_number: "0901234567", accounts: { account_id: "a", role_id: 3, email: "tam@example.com", status: "active" } },
    { profile_id: "p2", account_id: "b", full_name: "Khách khóa", accounts: { account_id: "b", role_id: 3, status: "inactive" } },
  ]);
  const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw new Error("Order service unavailable"); });
  for (const q of ["nguyen minh tam", "tam@example.com", "090123", ""]) {
    const result = await service.getAdminUsers({ role: "customer", status: "active", q, include_order_counts: "false" });
    assert.equal(result.users.length, 1);
    assert.equal(result.users[0].profile_id, "p");
  }
  const result = await service.getAdminUsers({ role: "customer", status: "active", q: "khong ton tai", include_order_counts: false });
  assert.equal(result.users.length, 0);
  assert.equal(fetchMock.mock.callCount(), 0);
});
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
for (const [role, create, roleId] of [["customer", service.createCustomer, 3], ["staff", service.createStaff, 2]]) {
test(`create ${role} persists phone only in profile, avatar, role and hashed initial password`, async t => {
  const writes = setup(t);
  const result = await create(valid, avatar);
  const account = writes.insertAccount.mock.calls[0].arguments[0];
  const profile = writes.insertProfile.mock.calls[0].arguments[0];
  assert.equal(account.role_id, roleId);
  assert.equal(account.email, valid.email);
  assert.equal(Object.hasOwn(account, "phone"), false);
  assert.equal(Object.hasOwn(account, "phone_number"), false);
  assert.ok(await bcrypt.compare(valid.phone, account.password));
  assert.equal(profile.account_id, result.accountId);
  for (const key of ["full_name", "identity_card", "gender", "dob", "address"]) assert.equal(profile[key], valid[key]);
  assert.equal(profile.phone_number, valid.phone);
  assert.equal(profile.avatar_url, "https://example.com/avatar.png");
});
}
test("update synchronizes account and profile and clears optional fields", async t => {
  const writes = setup(t);
  await service.updateProfileAll("a", valid, avatar, "admin");
  const profile = writes.updateProfileByAccountId.mock.calls[0].arguments[1];
  assert.equal(profile.phone_number, valid.phone);
  for (const key of ["full_name", "identity_card", "gender", "dob", "address"]) assert.equal(profile[key], valid[key]);
  assert.equal(profile.avatar_url, "https://example.com/avatar.png");
  assert.deepEqual(writes.accountUpdate.mock.calls[0].arguments, ["a", {email: valid.email}]);
  const result = await service.updateProfileAll("a", {...valid, dob:"", gender:"", address:"", identity_card:""}, null, "admin");
  for (const key of ["dob", "gender", "address", "identity_card"]) assert.equal(result.profile[key], null);
  assert.equal(result.profile.avatar_url, "old.png");
});
test("staff phone-only update writes to profile without updating accounts", async t => {
  const writes = setup(t);
  const result = await service.updateStaffProfile("a", { phone_number: valid.phone });
  assert.equal(writes.updateProfileByAccountId.mock.calls[0].arguments[1].phone_number, valid.phone);
  assert.equal(result.profile.phone_number, valid.phone);
  assert.equal(writes.accountUpdate.mock.callCount(), 0);
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

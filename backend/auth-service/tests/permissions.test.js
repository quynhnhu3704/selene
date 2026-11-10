import test from "node:test";
import assert from "node:assert/strict";
import { resolveAccountAccess, resolveRemoteAccess } from "../../shared/access.mjs";
process.env.JWT_ACCESS_SECRET ||= "test";
process.env.JWT_REFRESH_SECRET ||= "test";
process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_KEY ||= "test";
const { PermissionModel } = await import("../src/models/permission.model.js");
const { AccountModel } = await import("../src/models/account.model.js");
const { RoleModel } = await import("../src/models/role.model.js");
const service = await import("../src/services/permission.service.js");

function database(data, error = null) {
  return { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error }) }) }) }) };
}
test("authorization ignores old token roles and permissions", async () => {
  const row = { role_id: "2", status: "active", roles: { status: "active", role_permissions: [
    { permissions: { name: "product:view", status: "active" } },
    { permissions: { name: "product:update", status: "inactive" } },
  ] } };
  const claims = { accountId: "a", role: "admin", permissions: ["product:update"] };
  const access = await resolveAccountAccess(database(row), claims);
  assert.equal(access.role, "staff");
  assert.deepEqual(access.permissions, ["product:view"]);
  row.roles.role_permissions = [];
  assert.deepEqual((await resolveAccountAccess(database(row), claims)).permissions, []);
  row.roles.status = "inactive";
  await assert.rejects(resolveAccountAccess(database(row), claims), e => e.status === 403);
  await assert.rejects(resolveAccountAccess(database(null), claims), e => e.status === 403);
  await assert.rejects(resolveAccountAccess(database(null, new Error("offline")), claims), /offline/);
});

test("separate services resolve access via auth and fail closed on outage", async t => {
  const access = { accountId: "a", role: "staff", permissions: [] };
  const request = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "http://auth/session/access");
    assert.equal(options.headers.Authorization, "Bearer old-token");
    return { ok: true, json: async () => ({ data: access }) };
  });
  assert.deepEqual(await resolveRemoteAccess("old-token", "http://auth/"), access);
  request.mock.mockImplementation(async () => ({ ok: false, status: 403 }));
  await assert.rejects(resolveRemoteAccess("old-token"), e => e.status === 403);
  request.mock.mockImplementation(async () => ({ ok: false, status: 500 }));
  await assert.rejects(resolveRemoteAccess("old-token"), /unavailable/);
});

function setup(t) {
  t.mock.method(AccountModel, "findById", async () => ({ role_id: "1", status: "active" }));
  t.mock.method(RoleModel, "findById", async () => ({ role_id: "2", status: "active" }));
  t.mock.method(PermissionModel, "getPermissionById", async () => ({ name: "product:view", status: "active" }));
  return t.mock.method(PermissionModel, "setRolePermission", async () => {});
}
test("assignment validates boolean, protects owner, persists grant/revoke", async t => {
  const write = setup(t);
  for (const enabled of [true, false]) await service.setRolePermission("a", "2", "8", enabled);
  assert.equal(write.mock.callCount(), 2);
  for (const [role, enabled] of [["1", false], ["x", true], ["2", "false"]]) {
    await assert.rejects(service.setRolePermission("a", role, "8", enabled), e => e.status === 400);
  }
  assert.equal(write.mock.callCount(), 2);
});
test("inactive, unsupported and owner-only permissions cannot be granted but can be revoked", async t => {
  setup(t);
  for (const permission of [{name:"product:view",status:"inactive"},{name:"review:delete",status:"active"},{name:"permission:update",status:"active"}]) {
    t.mock.method(PermissionModel, "getPermissionById", async () => permission);
    await assert.rejects(service.setRolePermission("a", "2", "p", true), e => e.status === 400);
    await service.setRolePermission("a", "2", "p", false);
  }
});
test("staff and disabled roles cannot change assignments", async t => {
  setup(t);
  t.mock.method(RoleModel, "findById", async () => ({ status: "inactive" }));
  await assert.rejects(service.setRolePermission("a", "2", "p", false), e => e.status === 400);
  t.mock.method(AccountModel, "findById", async () => ({ role_id: "2", status: "active" }));
  await assert.rejects(service.getPermissionMatrix("a"), e => e.status === 403);
});
test("permission metadata rejects invalid fields and renaming integrated codes", async t => {
  setup(t);
  for (const body of [null, {}, {name:" "}, {name:123}, {name:"a:b",status:"unknown"}, {name:"a:b",description:42}, {name:"a:b",unexpected:true}]) {
    await assert.rejects(service.createNewPermission(body), e => e.status === 400);
  }
  await assert.rejects(service.updatePermission("p", {name:"product:renamed"}), e => e.status === 400);
});

import test from "node:test";
import assert from "node:assert/strict";

// Các model được mock; bài kiểm tra không đọc hoặc sửa dữ liệu thật.
process.env.JWT_ACCESS_SECRET = "permission-test-access";
process.env.JWT_REFRESH_SECRET = "permission-test-refresh";
process.env.SUPABASE_URL = "http://127.0.0.1:1";
process.env.SUPABASE_KEY = "permission-test-key";

const { AccountModel } = await import("../src/models/account.model.js");
const { RoleModel } = await import("../src/models/role.model.js");
const { PermissionModel } = await import("../src/models/permission.model.js");
const { getPermissionMatrix, setRolePermission } = await import("../src/services/permission.service.js");

test("Quản lý phân quyền", async (t) => {
  let account;
  let role;
  let permission;
  let writes;
  t.beforeEach(() => {
    account = { role_id: "1", status: "active" };
    role = { role_id: "2", status: "active" };
    permission = { permission_id: "8", status: "active" };
    writes = [];
    t.mock.method(AccountModel, "findById", async () => account);
    t.mock.method(RoleModel, "findById", async () => role);
    t.mock.method(PermissionModel, "getPermissionById", async () => permission);
    t.mock.method(PermissionModel, "getPermissionMatrix", async () => ({ roles: [role], permissions: [permission] }));
    t.mock.method(PermissionModel, "setRolePermission", async (...args) => { writes.push(args); });
  });
  t.afterEach(() => t.mock.restoreAll());

  await t.test("Chủ cửa hàng đọc được bảng quyền", async () => {
    assert.deepEqual(await getPermissionMatrix("owner"), { roles: [role], permissions: [permission] });
  });
  await t.test("Nhân viên và khách hàng không được đọc hoặc sửa quyền", async () => {
    for (const roleId of ["2", "3"]) {
      account.role_id = roleId;
      await assert.rejects(getPermissionMatrix("other"), { status: 403 });
      await assert.rejects(setRolePermission("other", "2", "8", true), { status: 403 });
    }
    assert.equal(writes.length, 0);
  });
  await t.test("Tài khoản bị khóa hoặc không tồn tại không được quản lý quyền", async () => {
    account.status = "inactive";
    await assert.rejects(setRolePermission("owner", "2", "8", true), { status: 403 });
    account = null;
    await assert.rejects(getPermissionMatrix("missing"), { status: 403 });
  });
  await t.test("Không được thay đổi quyền chủ cửa hàng", async () => {
    await assert.rejects(setRolePermission("owner", "1", "8", false), { status: 400 });
    assert.equal(writes.length, 0);
  });
  await t.test("Từ chối role hoặc enabled sai định dạng", async () => {
    for (const roleId of ["abc", "0", "-2", "2.5"]) {
      await assert.rejects(setRolePermission("owner", roleId, "8", true), { status: 400 });
    }
    for (const enabled of ["true", 1, undefined, null]) {
      await assert.rejects(setRolePermission("owner", "2", "8", enabled), { status: 400 });
    }
    assert.equal(writes.length, 0);
  });
  await t.test("Từ chối quyền hoặc vai trò không tồn tại", async () => {
    permission = null;
    await assert.rejects(setRolePermission("owner", "2", "missing", true), { status: 404 });
    permission = { status: "active" };
    role = null;
    await assert.rejects(setRolePermission("owner", "99", "8", true), { status: 404 });
  });
  await t.test("Không sửa vai trò đã khóa hoặc cấp quyền ngừng hoạt động", async () => {
    role.status = "inactive";
    await assert.rejects(setRolePermission("owner", "2", "8", false), { status: 400 });
    role.status = "active";
    permission.status = "inactive";
    await assert.rejects(setRolePermission("owner", "2", "8", true), { status: 400 });
    assert.equal(writes.length, 0);
  });
  await t.test("Cho phép thu hồi quyền ngừng hoạt động", async () => {
    permission.status = "inactive";
    await setRolePermission("owner", "2", "8", false);
    assert.deepEqual(writes, [[2, "8", false]]);
  });
  await t.test("Cấp và thu hồi đúng quyền của vai trò", async () => {
    assert.deepEqual(await setRolePermission("owner", "2", "8", true), {
      role_id: 2, permission_id: "8", enabled: true,
    });
    await setRolePermission("owner", "2", "8", false);
    assert.deepEqual(writes, [[2, "8", true], [2, "8", false]]);
  });
  await t.test("Lỗi ghi dữ liệu được báo lại, không báo thành công", async () => {
    t.mock.method(PermissionModel, "setRolePermission", async () => { throw new Error("Database unavailable"); });
    await assert.rejects(setRolePermission("owner", "2", "8", true), /Database unavailable/);
  });
});

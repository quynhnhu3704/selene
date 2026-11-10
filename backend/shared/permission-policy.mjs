// Only advertise permissions that are enforced by implemented endpoints.
const implemented = new Set([
  "user:view", "user:create", "user:update", "profile:view", "profile:update",
  "role:update", "permission:view", "permission:create", "permission:update",
  "product:view", "product:create", "product:update",
  "category:view", "category:create", "category:update",
  "brand:view", "brand:create", "brand:update",
  "promotion:view", "promotion:create", "promotion:update",
  "order:view", "order:create", "order:update", "order:cancel",
  "voucher:view", "voucher:create", "voucher:update",
  "cart:view", "cart:add", "cart:update",
  "chat:view", "chat:reply", "chat:assign", "chat:close",
]);
export function permissionPolicy(name) {
  return {
    enforced: implemented.has(name),
    owner_only: name.startsWith("permission:") || name.startsWith("role:"),
  };
}

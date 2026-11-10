import { supabase } from "../src/configs/supabase.js";

// Idempotent: add missing API permissions and grant only to the protected owner.
for (const [name, description] of [
  ["permission:create", "Thêm quyền hệ thống (chỉ chủ cửa hàng)"],
  ["chat:reply", "Trả lời tin nhắn khách hàng"],
]) {
  const found = await supabase.from("permissions").select("permission_id").eq("name", name).maybeSingle();
  if (found.error) throw found.error;
  let id = found.data?.permission_id;
  if (!id) {
    id = `per-${name.replace(":", "-")}`;
    const result = await supabase.from("permissions").insert({ permission_id: id, name, description, status: "active", created_at: new Date().toISOString() });
    if (result.error) throw result.error;
  }
  const assigned = await supabase.from("role_permissions").upsert(
    { role_id: "1", permission_id: id },
    { onConflict: "role_id,permission_id", ignoreDuplicates: true },
  );
  if (assigned.error) throw assigned.error;
  console.log(`Verified ${name}`);
}

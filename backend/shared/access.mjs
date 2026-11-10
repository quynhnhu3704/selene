// Never authorize from the permission snapshot in a previously issued JWT.
export async function resolveAccountAccess(db, claims) {
  if (!claims.accountId) throw { status: 403, message: "Tài khoản không hợp lệ!" };
  const { data, error } = await db.from("accounts")
    .select("account_id, role_id, status, roles(status, role_permissions(permissions(name, status)))")
    .eq("account_id", claims.accountId).maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "active" || data.roles?.status !== "active") {
    throw { status: 403, message: "Tài khoản hoặc vai trò đã bị khóa!" };
  }
  return {
    ...claims,
    role_id: data.role_id,
    role: ({ 1: "admin", 2: "staff", 3: "customer" })[data.role_id] || null,
    permissions: [...new Set((data.roles.role_permissions || [])
      .filter(row => row.permissions?.status === "active")
      .map(row => row.permissions.name))],
  };
}

// Other services have separate databases; auth owns accounts and role assignments.
export async function resolveRemoteAccess(token, authUrl = process.env.AUTH_SERVICE_URL || "http://127.0.0.1:8001") {
  const response = await fetch(`${authUrl.replace(/\/$/, "")}/session/access`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    if ([401, 403].includes(response.status)) {
      throw { status: response.status, message: "Phiên đăng nhập hoặc quyền truy cập không hợp lệ!" };
    }
    throw new Error("Authorization service unavailable");
  }
  const { data } = await response.json();
  if (!data?.accountId || !Array.isArray(data.permissions)) throw new Error("Invalid authorization response");
  return data;
}

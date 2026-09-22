import http from "./http";

export const getPermissionMatrix = () =>
  http.get("/auth/manage/permission-matrix");

export const setRolePermission = (roleId, permissionId, enabled) =>
  http.put(
    `/auth/manage/roles/${encodeURIComponent(roleId)}/permissions/${encodeURIComponent(permissionId)}`,
    { enabled },
  );

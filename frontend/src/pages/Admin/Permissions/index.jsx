import { useEffect, useRef, useState } from "react";
import AdminSelect from "../components/AdminSelect";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import Loading from "../../../components/common/Loading";
import {
  getPermissionMatrix,
  setRolePermission,
} from "../../../services/permission.service";
import PermissionCheckbox from "./components/PermissionCheckbox";
import {
  ROLE_LABELS,
  GROUP_LABELS,
  permissionLabel,
  normalize,
  permissionKey,
  matrixSelection,
} from "./constants";
import "./permissions.css";

export default function AdminPermissions() {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [saved, setSaved] = useState(new Set());
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const saveLock = useRef(false);
  const changes = [...new Set([...selected, ...saved])].filter(
    (key) => selected.has(key) !== saved.has(key),
  );
  const dirty = changes.length > 0;

  useEffect(() => {
    let current = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await getPermissionMatrix();
        if (!current) return;
        setPermissions(data.data.permissions);
        setRoles(data.data.roles);
        const selection = matrixSelection(data.data.roles);
        setSaved(selection);
        setSelected(new Set(selection));
      } catch (err) {
        if (current)
          setError(
            err.response?.data?.message || "Không thể tải bảng phân quyền!",
          );
      } finally {
        if (current) setLoading(false);
      }
    };
    load();
    return () => {
      current = false;
    };
  }, [revision]);

  useEffect(() => {
    if (!dirty && !saving) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const guardLink = (event) => {
      const link = event.target.closest("a[href]");
      if (
        !link ||
        link.target === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (
        saving ||
        !window.confirm(
          "Bạn có thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLink, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guardLink, true);
    };
  }, [dirty, saving]);

  const canEdit = (role, permission) =>
    Number(role.role_id) !== 1 &&
    role.status === "active" &&
    (permission.status === "active" ||
      saved.has(permissionKey(role.role_id, permission.permission_id)));

  const togglePermissions = (role, rows, enabled) => {
    setSelected((previous) => {
      const next = new Set(previous);
      rows
        .filter((permission) => canEdit(role, permission))
        .forEach((permission) => {
          // Quyền ngừng hoạt động chỉ được thu hồi, không cấp mới.
          const key = permissionKey(role.role_id, permission.permission_id);
          if (enabled && permission.status !== "active" && !saved.has(key))
            return;
          if (enabled) next.add(key);
          else next.delete(key);
        });
      return next;
    });
  };

  const handleSave = async () => {
    if (saveLock.current || !dirty) return;
    saveLock.current = true;
    setSaving(true);
    let completed = 0;
    try {
      const confirmation = await Swal.fire({
        title: "Lưu phân quyền?",
        text: `${changes.length} thay đổi sẽ áp dụng cho tất cả tài khoản thuộc vai trò tương ứng.`,
        showCancelButton: true,
        confirmButtonText: "Lưu thay đổi",
        cancelButtonText: "Hủy",
        reverseButtons: true,
        focusCancel: true,
        buttonsStyling: false,
        customClass: {
          popup: "se-swal-popup",
          title: "se-swal-title",
          htmlContainer: "se-swal-text",
          confirmButton: "se-btn-confirm",
          cancelButton: "se-btn-cancel",
          actions: "se-swal-actions",
        },
      });
      if (!confirmation.isConfirmed) return;
      // Ghi nhận từng quyền đã lưu để có thể thử lại nếu kết nối bị gián đoạn.
      for (const role of roles) {
        for (const permission of permissions) {
          const key = permissionKey(role.role_id, permission.permission_id);
          if (!changes.includes(key)) continue;
          const enabled = selected.has(key);
          await setRolePermission(
            role.role_id,
            permission.permission_id,
            enabled,
          );
          setSaved((previous) => {
            const next = new Set(previous);
            if (enabled) next.add(key);
            else next.delete(key);
            return next;
          });
          completed += 1;
        }
      }
      toast.success("Đã lưu phân quyền thành công!");
    } catch (err) {
      toast.error(
        `Đã lưu ${completed}/${changes.length} thay đổi. ${err.response?.data?.message || "Kết nối bị gián đoạn."} Vui lòng lưu lại các thay đổi còn lại.`,
        { autoClose: false },
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const groups = [
    ...new Set(permissions.map((permission) => permission.name.split(":")[0])),
  ];
  const query = normalize(search).trim();
  const visible = permissions.filter((permission) => {
    const key = permission.name.split(":")[0];
    return (
      (!group || key === group) &&
      (!query ||
        normalize(
          `${permission.name} ${permissionLabel(permission)} ${GROUP_LABELS[key] || key}`,
        ).includes(query))
    );
  });
  const visibleGroups = groups
    .map((key) => ({
      key,
      rows: visible.filter(
        (permission) => permission.name.split(":")[0] === key,
      ),
    }))
    .filter((item) => item.rows.length);

  return (
    <div className="adm-permissions">
      <Helmet>
        <title>Phân quyền | Selene</title>
      </Helmet>
      <div className="adm-page-head">
        <div className="adm-page-title">Phân quyền</div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            className="form-btn btn btn-outline-dark fw-semibold px-4"
            disabled={!dirty || saving}
            onClick={() => setSelected(new Set(saved))}
          >
            <i className="bi bi-arrow-counterclockwise me-2" />
            Hủy thay đổi
          </button>
          <button
            className="form-btn btn btn-dark fw-semibold px-4"
            disabled={!dirty || saving || loading || !!error}
            onClick={handleSave}
          >
            <i className="bi bi-check2 me-2" />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
      {loading ? (
        <div
          className="d-flex align-items-center justify-content-center"
          style={{ minHeight: "60vh" }}
        >
          <Loading text="Đang tải bảng phân quyền..." />
        </div>
      ) : error ? (
        <div className="page-empty py-5" role="alert">
          <p className="text-danger">{error}</p>
          <button
            className="form-btn btn btn-outline-dark fw-semibold px-4"
            onClick={() => setRevision((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <div className="adm-toolbar">
            <div className="adm-toolbar-search">
              <i className="bi bi-search" />
              <input
                className="form-control"
                placeholder="Tìm quyền hoặc chức năng..."
                aria-label="Tìm quyền"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <AdminSelect
              icon="bi-funnel"
              aria-label="Lọc nhóm chức năng"
              value={group}
              onChange={(event) => setGroup(event.target.value)}
            >
              <option value="">Tất cả chức năng</option>
              {groups.map((key) => (
                <option key={key} value={key}>
                  {GROUP_LABELS[key] || key}
                </option>
              ))}
            </AdminSelect>
            <button
              className="form-btn btn btn-outline-dark fw-semibold mb-0 px-4"
              onClick={() => {
                setSearch("");
                setGroup("");
              }}
            >
              <i className="bi bi-arrow-counterclockwise me-1" />
              Đặt lại
            </button>
          </div>
          <div
            className="d-flex justify-content-between gap-2 flex-wrap mb-3 small text-muted"
            aria-live="polite"
          >
            <span>
              {visible.length}/{permissions.length} quyền · {roles.length} vai
              trò
            </span>
            <span className={dirty ? "text-warning-emphasis fw-semibold" : ""}>
              {dirty
                ? `${changes.length} thay đổi chưa lưu`
                : "Không có thay đổi chưa lưu"}
            </span>
          </div>
          <div className="adm-table-wrap table-responsive">
            <table className="table adm-table mb-0 permission-table">
              <thead>
                <tr>
                  <th>Chức năng / Quyền hạn</th>
                  {roles.map((role) => (
                    <th key={role.role_id} className="text-center">
                      {ROLE_LABELS[role.role_id] || role.name}
                      <div className="fw-normal text-muted small mt-1">
                        {Number(role.role_id) === 1
                          ? "Được bảo vệ"
                          : role.status !== "active"
                            ? "Vai trò đã khóa"
                            : `${permissions.filter((permission) => selected.has(permissionKey(role.role_id, permission.permission_id))).length} quyền đã chọn`}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              {visibleGroups.map(({ key, rows }) => (
                <tbody key={key}>
                  <tr className="permission-group">
                    <th scope="row">
                      {GROUP_LABELS[key] || key}
                      <span className="ms-2 text-muted fw-normal small">
                        {rows.length} quyền
                      </span>
                    </th>
                    {roles.map((role) => {
                      const editable = rows.filter(
                        (permission) =>
                          canEdit(role, permission) &&
                          permission.status === "active",
                      );
                      const count = editable.filter((permission) =>
                        selected.has(
                          permissionKey(role.role_id, permission.permission_id),
                        ),
                      ).length;
                      return (
                        <td key={role.role_id} className="text-center">
                          <PermissionCheckbox
                            checked={
                              editable.length > 0 && count === editable.length
                            }
                            mixed={count > 0 && count < editable.length}
                            disabled={saving || !editable.length}
                            label={`Chọn các quyền đang hiển thị: ${GROUP_LABELS[key] || key}, ${ROLE_LABELS[role.role_id] || role.name}`}
                            onChange={(event) =>
                              togglePermissions(
                                role,
                                editable,
                                event.target.checked,
                              )
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                  {rows.map((permission) => (
                    <tr key={permission.permission_id}>
                      <td>
                        <div className="fw-semibold">
                          {permissionLabel(permission)}
                          {permission.status !== "active" && (
                            <span className="badge bg-secondary-subtle text-secondary ms-2">
                              Ngừng hoạt động
                            </span>
                          )}
                        </div>
                        <div className="small text-muted mt-1">
                          {permission.name}
                        </div>
                      </td>
                      {roles.map((role) => {
                        const key = permissionKey(
                          role.role_id,
                          permission.permission_id,
                        );
                        const changed = saved.has(key) !== selected.has(key);
                        return (
                          <td
                            key={role.role_id}
                            className={`text-center${changed ? " permission-changed" : ""}`}
                          >
                            <PermissionCheckbox
                              checked={selected.has(key)}
                              disabled={saving || !canEdit(role, permission)}
                              label={`${permissionLabel(permission)} — ${ROLE_LABELS[role.role_id] || role.name}`}
                              onChange={(event) =>
                                togglePermissions(
                                  role,
                                  [permission],
                                  event.target.checked,
                                )
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              ))}
              {!visible.length && (
                <tbody>
                  <tr>
                    <td colSpan={roles.length + 1} className="page-empty py-5">
                      <i className="bi bi-shield page-empty-icon" />
                      <p className="mb-0">
                        {permissions.length
                          ? "Không tìm thấy quyền phù hợp."
                          : "Chưa có quyền nào trong hệ thống."}
                      </p>
                    </td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
          <p className="small text-muted mt-3 mb-0">
            Checkbox ở hàng tên nhóm chọn các quyền đang hoạt động và đang hiển
            thị. Ô có nền vàng là thay đổi chưa lưu.
          </p>
        </>
      )}
    </div>
  );
}

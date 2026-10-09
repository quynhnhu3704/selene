// frontend/src/pages/Admin/Staffs/index.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import confirmLock from "../../../utils/confirmLock";
import {
  getAdminStaffs,
  getProfile,
  getAdminUserDetail,
  toggleAdminUserStatus,
} from "../../../services/user.service";

import http from "../../../services/http";

import UserList from "../components/UserList";

const USERS_PER_PAGE = 12;
// Các API cũ trả totalItems, API users trả total_pages.
const loadAllPages = async (fetchPage) => {
  const rows = [];
  let page = 1;
  while (true) {
    const { data } = await fetchPage(page);
    rows.push(...data.data);
    const total = data.pagination.totalItems ?? data.pagination.total_items;
    if (!data.data.length || rows.length >= total) return rows;
    page += 1;
  }
};

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

const loadStaffs = async ({ q, sort, status }) => {
  const [self, staffs, profiles, accounts] = await Promise.all([
    getProfile(),
    loadAllPages((page) => getAdminStaffs({ page, limit: 100 })),
    loadAllPages((page) =>
      http.get("/auth/manage/profiles", { params: { page, limit: 100 } }),
    ),
    loadAllPages((page) =>
      http.get("/auth/manage/accounts", { params: { page, limit: 100 } }),
    ),
  ]);
  const selfId = self.data.profile.profile_id;
  const managers = await Promise.all(
    profiles
      .filter((user) => Number(user.role_id) === 1)
      .map(async (user) => {
        const { data } = await getAdminUserDetail(user.profile_id);
        return { ...data.data, phone_number: data.data.phone };
      }),
  );
  const accountMap = new Map(accounts.map((user) => [user.account_id, user]));
  const query = normalize(q).trim();
  const phoneQuery = query.replace(/\D/g, "");
  const users = [...staffs, ...managers]
    .map((user) => ({
      ...user,
      is_self: user.profile_id === selfId,
      created_at:
        accountMap.get(user.account_id)?.created_at || user.created_at,
    }))
    .filter(
      (user) =>
        (!status || user.status === status) &&
        (!query ||
          [user.full_name, user.email, user.phone_number].some((value) =>
            normalize(value).includes(query),
          ) ||
          (phoneQuery.length >= 3 &&
            String(user.phone_number || "").includes(phoneQuery))),
    );
  const collator = new Intl.Collator("vi", { sensitivity: "base" });
  users.sort((a, b) => {
    const result = ["az", "za"].includes(sort)
      ? (collator.compare(
          String(a.full_name || "")
            .trim()
            .split(/\s+/)
            .at(-1),
          String(b.full_name || "")
            .trim()
            .split(/\s+/)
            .at(-1),
        ) || collator.compare(a.full_name || "", b.full_name || "")) *
        (sort === "za" ? -1 : 1)
      : (new Date(a.created_at || 0) - new Date(b.created_at || 0)) *
        (sort === "oldest" ? 1 : -1);
    return result || a.profile_id.localeCompare(b.profile_id);
  });
  return users;
};
const basePath = "/admin/nhan-vien";

export default function AdminStaffs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const allowedSorts = ["default", "newest", "oldest", "az", "za"];
  const sort = allowedSorts.includes(searchParams.get("sort"))
    ? searchParams.get("sort")
    : "default";
  const status = ["active", "inactive"].includes(searchParams.get("status"))
    ? searchParams.get("status")
    : "";
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;
  const [searchValue, setSearchValue] = useState(q);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: USERS_PER_PAGE,
    total_items: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [revision, setRevision] = useState(0);
  const updateUserQuery = (changes) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (!("page" in changes)) next.delete("page");
        Object.entries(changes).forEach(([key, value]) => {
          if (!value || (key === "page" && Number(value) === 1)) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        });
        return next;
      },
      { replace: true },
    );
  };

  // Reset only when the URL query changes; preserve the local typing draft.
  const [previousQuery, setPreviousQuery] = useState(q);
  if (previousQuery !== q) {
    setPreviousQuery(q);
    setSearchValue(q);
  }

  // Prepare request state before committing a changed route/filter.
  const requestKey = JSON.stringify([q, sort, status, page, revision]);
  const [previousRequestKey, setPreviousRequestKey] = useState(requestKey);
  if (previousRequestKey !== requestKey) {
    setPreviousRequestKey(requestKey);
    setLoading(true);
    setError("");
  }

  useEffect(() => {
    let isCurrentRequest = true;
    const timer = setTimeout(async () => {
      try {
        const rows = await loadStaffs({ q, sort, status });
        if (isCurrentRequest) {
          const totalPages = Math.ceil(rows.length / USERS_PER_PAGE);
          const currentPage = Math.min(page, Math.max(1, totalPages));
          setUsers(
            rows.slice(
              (currentPage - 1) * USERS_PER_PAGE,
              currentPage * USERS_PER_PAGE,
            ),
          );
          setPagination({
            page: currentPage,
            limit: USERS_PER_PAGE,
            total_items: rows.length,
            total_pages: totalPages,
          });
        }
      } catch (err) {
        if (isCurrentRequest)
          setError(
            err.response?.data?.message ||
              "Không thể tải danh sách người dùng!",
          );
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    }, 250);
    return () => {
      isCurrentRequest = false;
      clearTimeout(timer);
    };
  }, [q, sort, status, page, revision]);

  // Khóa / mở khóa tài khoản và cập nhật tại chỗ trong danh sách
  const handleLock = async (user) => {
    if (updatingId || user.is_self) return;
    const isLocking = user.status === "active";
    const name = user.full_name || user.email;
    setUpdatingId(user.account_id);
    try {
      if (
        isLocking &&
        !(await confirmLock("Khóa tài khoản", `Khóa tài khoản ${name}?`))
      )
        return;

      const { data } = await toggleAdminUserStatus(user.account_id);
      setUsers((previous) =>
        previous.map((item) =>
          item.account_id === user.account_id
            ? { ...item, status: data.data.status }
            : item,
        ),
      );
      toast.success(`Đã ${isLocking ? "khóa" : "mở khóa"} tài khoản ${name}`);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Không thể cập nhật trạng thái!",
      );
    } finally {
      setUpdatingId("");
    }
  };

  // Xuất Excel theo bộ lọc hiện tại
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const rows = await loadStaffs({ q, sort, status });
      const escapeCell = (value) => {
        const text = String(value ?? "");
        const safe = /^[=+@\-\t\r]/.test(text) ? `\t${text}` : text;
        return `"${safe.replace(/"/g, '\"\"')}"`;
      };
      const cells = [
        [
          "Họ tên",
          "Email",
          "Số điện thoại",
          "Vai trò",
          "Trạng thái",
          "Ngày tham gia",
        ],
        ...rows.map((user) => [
          user.full_name,
          user.email,
          user.phone_number,
          user.role_name,
          user.status,
          user.created_at,
        ]),
      ];
      const data = new Blob(
        [
          "\uFEFF",
          cells.map((row) => row.map(escapeCell).join(",")).join("\r\n"),
        ],
        { type: "text/csv;charset=utf-8" },
      );
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      link.download = `staffs_export_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Xuất Excel thành công!");
    } catch {
      toast.error("Không thể xuất Excel. Vui lòng thử lại!");
    } finally {
      setExporting(false);
    }
  };

  const returnQuery = `returnUrl=${encodeURIComponent(basePath + (searchParams.size ? `?${searchParams}` : ""))}`;
  const handleSearch = (value, composing) => {
    setSearchValue(value);
    if (!composing) updateUserQuery({ q: value.trim() });
  };

  const handleResetFilters = () => {
    setSearchValue("");
    setSearchParams({});
    setRevision((value) => value + 1);
  };

  return (
    <UserList
      title="Nhân viên"
      showCreateButton
      createPath="/admin/nhan-vien/them-moi"
      users={users}
      pagination={pagination}
      search={searchValue}
      sort={sort}
      status={status}
      loading={loading}
      error={error}
      exporting={exporting}
      updatingId={updatingId}
      onSearch={handleSearch}
      onSort={(value) => updateUserQuery({ sort: value })}
      onStatus={(value) => updateUserQuery({ status: value })}
      onPageChange={(value) => updateUserQuery({ page: value })}
      onReset={handleResetFilters}
      onLock={handleLock}
      onExport={handleExportExcel}
      editPath={(user) => `${basePath}/${user.profile_id}/sua?${returnQuery}`}
      detailPath={(user) => `${basePath}/${user.profile_id}?${returnQuery}`}
    />
  );
}

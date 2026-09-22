// frontend/src/pages/Admin/Users/index.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import confirmLock from "../../../utils/confirmLock";
import {
  getAdminCustomers,
  exportAdminUsers,
  toggleAdminUserStatus,
} from "../../../services/user.service";

import UserList from "../components/UserList";

const USERS_PER_PAGE = 12;
const role = "customer";
const basePath = "/admin/khach-hang";

export default function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const allowedSorts = [
    "default",
    "newest",
    "oldest",
    "az",
    "za",
    "orders_asc",
    "orders_desc",
  ];
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

  useEffect(() => {
    setSearchValue(q);
  }, [q]);

  useEffect(() => {
    let isCurrentRequest = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const { data } = await getAdminCustomers({
          q,
          sort: sort === "default" ? "newest" : sort,
          status,
          page,
          limit: USERS_PER_PAGE,
        });
        if (isCurrentRequest) {
          setUsers(data.data);
          setPagination(data.pagination);
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
    if (updatingId) return;
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
      const { data } = await exportAdminUsers({ role, q, sort: sort === "default" ? "newest" : sort, status });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      link.download = `customers_export_${dateStr}.xlsx`;
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
      title="Khách hàng"
      showCreateButton
      createPath="/admin/khach-hang/them-moi"
      showOrders
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

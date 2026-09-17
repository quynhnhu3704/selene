// frontend/src/pages/Admin/components/UserList.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Pagination from "../../../components/common/Pagination";
import Loading from "../../../components/common/Loading";
import fallbackAvatar from "../../../assets/images/default-avatar.png";

const formatPhone = (phone) =>
  String(phone || "").replace(/^(\d{4})(\d{3})(\d{3})$/, "$1.$2.$3") || "—";
// Hiển thị ngày sinh và ngày tham gia theo DD/MM/YYYY.
const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

export default function UserList({
  title,
  users,
  pagination,
  search,
  sort,
  status,
  onSearch,
  onSort,
  onStatus,
  onReset,
  onPageChange,
  onExport,
  onLock,
  editPath,
  detailPath,
  showOrders = false,
  showCreateButton = false,
  createPath,
  loading,
  exporting,
  error,
  updatingId,
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);
  const composing = useRef(false);
  const sortOptions = [
    { key: "default", label: "Mặc định" },
    { key: "newest", label: "Ngày tham gia: Mới nhất" },
    { key: "oldest", label: "Ngày tham gia: Cũ nhất" },
    { key: "az", label: "Tên: A → Z" },
    { key: "za", label: "Tên: Z → A" },
    ...(showOrders
      ? [
          { key: "orders_asc", label: "Đơn hàng: Ít → Nhiều" },
          { key: "orders_desc", label: "Đơn hàng: Nhiều → Ít" },
        ]
      : []),
  ];
  useEffect(() => {
    const close = (event) => {
      if (!sortRef.current?.contains(event.target) || event.key === "Escape")
        setSortOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <>
      <Helmet>
        <title>Quản lý {title.toLowerCase()} | Selene</title>
      </Helmet>
      <div className="adm-page-head">
        <div className="adm-page-title">{title}</div>
        <div className="d-flex gap-3">
          <button
            className="form-btn btn btn-outline-dark btn-export fw-semibold px-4 d-flex align-items-center justify-content-center"
            disabled={exporting}
            onClick={onExport}
          >
            <i className="bi bi-download me-2" />
            {exporting ? "Đang xuất..." : "Xuất dữ liệu"}
          </button>
          {showCreateButton && (
            <Link
              to={createPath}
              className="form-btn btn btn-dark fw-semibold px-4"
            >
              <i className="bi bi-plus-lg me-1" />
              Thêm {title.toLowerCase()}
            </Link>
          )}
        </div>
      </div>
      <div className="adm-toolbar">
        <div className="adm-toolbar-search">
          <i className="bi bi-search" />
          <input
            className="form-control"
            aria-label="Tìm người dùng"
            placeholder="Tìm theo tên, email hoặc số điện thoại..."
            value={search}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(e) => {
              composing.current = false;
              onSearch(e.target.value);
            }}
            onChange={(e) => onSearch(e.target.value, composing.current)}
          />
        </div>
        <div className="dropdown" ref={sortRef} style={{ minWidth: 240 }}>
          <button
            type="button"
            className="form-control text-start d-flex justify-content-between align-items-center"
            aria-expanded={sortOpen}
            onClick={() => setSortOpen(!sortOpen)}
          >
            <span>
              <i className="bi bi-sort-down me-2" />
              {sortOptions.find((option) => option.key === sort)?.label}
            </span>
            <i className={`bi bi-caret-${sortOpen ? "up" : "down"}`} />
          </button>
          {sortOpen && (
            <ul className="dropdown-menu show w-100 mt-1 shadow-sm">
              {sortOptions.map((option) => (
                <li key={option.key}>
                  <button
                    className="dropdown-item fw-normal"
                    onClick={() => {
                      onSort(option.key);
                      setSortOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="reset"
          className="form-btn btn btn-outline-dark fw-semibold mb-0 px-4"
          onClick={onReset}
        >
          <i className="bi bi-arrow-counterclockwise me-1" />
          Đặt lại
        </button>
        <div className="adm-tabs">
          {[
            { key: "", label: "Tất cả" },
            { key: "active", label: "Hoạt động" },
            { key: "inactive", label: "Đã khóa" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`adm-tab-btn${status === tab.key ? " active" : ""}`}
              onClick={() => onStatus(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="adm-table-wrap table-responsive">
        <table className="table adm-table mb-0">
          <thead>
            <tr>
              <th className="text-center" style={{ width: "5%" }}></th>
              <th style={{ width: "30%" }}>Người dùng</th>
              <th className="text-center">Số điện thoại</th>
              {showOrders && <th className="text-center">Đơn hàng</th>}
              <th className="text-center">Ngày sinh</th>
              <th className="text-center">Ngày tạo</th>
              <th className="text-center">Trạng thái</th>
              <th className="text-center"></th>
            </tr>
          </thead>
          <tbody>
            {loading || error || !users.length ? (
              <tr>
                <td
                  colSpan={showOrders ? 8 : 7}
                  className={`text-center py-5 ${error ? "text-danger" : "page-empty"}`}
                >
                  {loading ? (
                    <Loading text="Đang tải người dùng..." />
                  ) : (
                    error || (
                      <>
                        <i className="bi bi-inbox page-empty-icon" />
                        <p className="mt-3 mb-1 fw-semibold text-secondary">
                          Không tìm thấy người dùng
                        </p>
                        <p className="text-muted">
                          Thử lại với từ khóa hoặc bộ lọc khác!
                        </p>
                      </>
                    )
                  )}
                </td>
              </tr>
            ) : (
              users.map((user, index) => (
                <tr key={user.account_id}>
                  <td className="text-center">
                    <span className="adm-stt">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </span>
                  </td>
                  <td>
                    <div className="adm-cell">
                      <Link to={detailPath(user)} className="adm-link">
                        <img
                          src={user.avatar_url || fallbackAvatar}
                          alt=""
                          className="adm-thumb"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = fallbackAvatar;
                          }}
                        />
                      </Link>
                      <div>
                        {/* Căn trái họ tên cho cả nhân viên và khách hàng. */}
                        <Link
                          to={detailPath(user)}
                          className="adm-link align-self-start text-start"
                        >
                          <div className="adm-name">
                            {user.full_name || "Chưa cập nhật"}
                          </div>
                        </Link>
                        <div className="adm-sub">{user.email || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center text-nowrap">
                    {formatPhone(user.phone_number)}
                  </td>
                  {showOrders && (
                    <td className="text-center">
                      {/* Màu số đơn dùng cùng class với cột tồn kho. */}
                      <span
                        className={`adm-stock rounded-pill ${
                          (user.order_count || 0) >= 7
                            ? "text-success bg-success-subtle"
                            : (user.order_count || 0) >= 3
                              ? "text-warning bg-warning-subtle"
                              : "text-danger bg-danger-subtle"
                        }`}
                      >
                        {(user.order_count || 0).toLocaleString("vi-VN")}
                      </span>
                    </td>
                  )}
                  <td className="text-center text-nowrap">
                    {formatDate(user.dob)}
                  </td>
                  <td className="text-center text-nowrap">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="text-center">
                    <span
                      className={`adm-status rounded-pill ${user.status === "active" ? "text-success bg-success-subtle" : "text-danger bg-danger-subtle"}`}
                    >
                      {user.status === "active" ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-1 justify-content-center">
                      <Link
                        to={editPath(user)}
                        className="adm-action-btn"
                        title="Chỉnh sửa"
                      >
                        <i className="bi bi-pencil-square" />
                      </Link>
                      <button
                        className={`adm-action-btn ${user.status === "active" ? "lock" : "unlock"}`}
                        disabled={updatingId === user.account_id}
                        title={
                          user.status === "active"
                            ? "Khóa tài khoản"
                            : "Mở khóa tài khoản"
                        }
                        onClick={() => onLock(user)}
                      >
                        <i
                          className={`bi bi-${user.status === "active" ? "lock" : "unlock"}`}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && !error && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          totalItems={pagination.total_items}
          displayedCount={users.length}
          label={title.toLowerCase()}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}

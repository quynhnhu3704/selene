// frontend/src/pages/Admin/Orders/index.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Loading from "../../../components/common/Loading";
import Pagination from "../../../components/common/Pagination";
import { toast } from "react-toastify";
import {
  getAdminOrders,
  exportAdminOrders,
} from "../../../services/order.service";
import { getUser } from "../../../utils/auth";
import {
  ORDER_STATUSES,
  SORT_OPTIONS,
  getOrderStatus,
  fmtVND,
  formatDate,
} from "./constants";

const ORDERS_PER_PAGE = 12;
const TABS = [{ key: "", label: "Tất cả" }, ...ORDER_STATUSES];

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const sort = SORT_OPTIONS.some(
    (item) => item.key === searchParams.get("sort"),
  )
    ? searchParams.get("sort")
    : "default";
  const status = TABS.some((item) => item.key === searchParams.get("status"))
    ? searchParams.get("status")
    : "";
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;
  const [searchValue, setSearchValue] = useState(q);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [revision, setRevision] = useState(0);

  const composing = useRef(false);
  const user = getUser();
  const canEdit =
    ["admin", "staff"].includes(user?.role) &&
    user?.permissions?.includes("order:update");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ORDERS_PER_PAGE,
    total_items: 0,
    total_pages: 0,
  });

  const updateOrderQuery = (changes) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (!("page" in changes)) next.delete("page");
        Object.entries(changes).forEach(([key, value]) => {
          const normalized = key === "q" ? value.trim() : value;
          if (
            !normalized ||
            (key === "page" && Number(normalized) === 1) ||
            (key === "sort" && normalized === "default")
          ) {
            next.delete(key);
          } else next.set(key, String(normalized));
        });
        return next;
      },
      { replace: "q" in changes },
    );
  };

  useEffect(() => {
    let isCurrentRequest = true;
    const fetchOrders = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getAdminOrders({
          q,
          sort,
          status,
          page,
          limit: ORDERS_PER_PAGE,
        });
        if (!isCurrentRequest) return;
        setOrders(res.data.orders);
        setPagination(res.data.pagination);
      } catch (err) {
        if (isCurrentRequest)
          setError(
            err.response?.data?.message || "Không thể tải danh sách đơn hàng!",
          );
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    };
    fetchOrders();
    return () => {
      isCurrentRequest = false;
    };
  }, [q, sort, status, page, revision]);

  useEffect(() => {
    setSearchValue(q);
  }, [q]);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await exportAdminOrders({ q, status, sort });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `don-hang-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Xuất dữ liệu đơn hàng thành công!");
    } catch (err) {
      let message = "Không thể xuất dữ liệu đơn hàng!";
      try {
        message = JSON.parse(await err.response.data.text()).message || message;
      } catch {
        /* Use fallback. */
      }
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const returnUrl = encodeURIComponent(
    `/admin/don-hang${searchParams.size ? `?${searchParams}` : ""}`,
  );

  return (
    <>
      <Helmet>
        <title>Quản lý đơn hàng | Selene</title>
      </Helmet>
      <div className="adm-page-head">
        <div className="adm-page-title">Đơn hàng</div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="form-btn btn btn-export btn-outline-dark fw-semibold px-4"
            disabled={exporting}
            onClick={handleExport}
          >
            <i className="bi bi-download me-2" />
            {exporting ? "Đang xuất..." : "Xuất dữ liệu"}
          </button>
          {user?.permissions?.includes("order:create") && (
            <Link
              className="form-btn btn btn-dark fw-semibold px-4"
              to="/admin/don-hang/them"
            >
              <i className="bi bi-plus-lg me-2" />
              Thêm đơn hàng
            </Link>
          )}
        </div>
      </div>
      <div className="adm-toolbar">
        <div className="adm-toolbar-search">
          <i className="bi bi-search" />
          <input
            className="form-control"
            aria-label="Tìm theo mã đơn hoặc tên khách hàng"
            placeholder="Tìm theo mã đơn hoặc tên khách hàng..."
            value={searchValue}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(e) => {
              composing.current = false;
              updateOrderQuery({ q: e.target.value });
            }}
            onChange={(e) => {
              setSearchValue(e.target.value);
              if (!composing.current) updateOrderQuery({ q: e.target.value });
            }}
          />
        </div>
        <select
          className="form-select form-control"
          style={{ width: "17.5%", minWidth: 190 }}
          aria-label="Lọc trạng thái đơn hàng"
          value={status}
          onChange={(e) => updateOrderQuery({ status: e.target.value })}
        >
          <option value="">Tất cả trạng thái</option>
          {ORDER_STATUSES.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className="form-select form-control"
          style={{ width: "17.5%", minWidth: 190 }}
          aria-label="Sắp xếp đơn hàng"
          value={sort}
          onChange={(e) => updateOrderQuery({ sort: e.target.value })}
        >
          {SORT_OPTIONS.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="reset"
          className="form-btn btn btn-outline-dark fw-semibold mb-0 px-4"
          onClick={() => {
            setSearchValue("");
            updateOrderQuery({ q: "", sort: "", status: "", page: 1 });
          }}
        >
          <i className="bi bi-arrow-counterclockwise me-1" />
          Đặt lại
        </button>
      </div>
      <div className="adm-table-wrap table-responsive">
        <table className="table adm-table mb-0">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th className="text-center">Sản phẩm</th>
              <th className="text-end">Tổng tiền</th>
              <th className="text-center">Ngày đặt</th>
              <th className="text-center">Trạng thái</th>
              <th className="text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading || error || !orders.length ? (
              <tr>
                <td colSpan={7} className="page-empty py-5">
                  {loading ? (
                    <Loading text="Đang tải đơn hàng..." />
                  ) : error ? (
                    <>
                      <p className="text-danger">{error}</p>
                      <button
                        className="btn btn-outline-dark form-btn"
                        onClick={() => setRevision((value) => value + 1)}
                      >
                        Thử lại
                      </button>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-inbox page-empty-icon" />
                      <p className="mt-3 mb-1 fw-semibold text-secondary">
                        Không tìm thấy đơn hàng
                      </p>
                      <p className="text-muted">
                        Thử lại với từ khóa hoặc bộ lọc khác!
                      </p>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const state = getOrderStatus(order.status);
                const quantity = Number(order.total_quantity || 0);
                // Ít: đỏ, vừa: vàng, nhiều: xanh, dùng badge sẵn có của trang quản lý.
                const color =
                  quantity >= 5
                    ? "success"
                    : quantity >= 3
                      ? "warning"
                      : "danger";
                const detail = `/admin/don-hang/${encodeURIComponent(order.order_id)}`;
                return (
                  <tr key={order.order_id}>
                    <td>
                      <Link
                        className="adm-link fw-semibold text-break"
                        to={`${detail}?returnUrl=${returnUrl}`}
                      >
                        {order.order_code}
                      </Link>
                    </td>
                    <td>
                      <div className="adm-name">{order.recipient_name}</div>
                      <div className="adm-sub">
                        {order.recipient_phone || "—"}
                      </div>
                    </td>
                    <td className="text-center">
                      <span
                        className={`adm-stock rounded-pill text-${color} bg-${color}-subtle`}
                      >
                        {quantity.toLocaleString("vi-VN")}
                      </span>
                    </td>
                    <td className="text-end fw-semibold">
                      {fmtVND(order.final_amount)}
                    </td>
                    <td className="text-center">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="text-center">
                      <span
                        className={`adm-status rounded-pill w-auto text-${state.color} bg-${state.color}-subtle`}
                      >
                        {state.label}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="d-flex gap-1 justify-content-center">
                        <Link
                          className="adm-action-btn"
                          title="Xem chi tiết"
                          aria-label={`Xem đơn ${order.order_code}`}
                          to={`${detail}?returnUrl=${returnUrl}`}
                        >
                          <i className="bi bi-eye" />
                        </Link>
                        {canEdit && (
                          <Link
                            className="adm-action-btn"
                            title="Chỉnh sửa"
                            aria-label={`Sửa đơn ${order.order_code}`}
                            to={`${detail}/sua?returnUrl=${returnUrl}`}
                          >
                            <i className="bi bi-pencil-square" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {!loading && !error && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          totalItems={pagination.total_items}
          displayedCount={orders.length}
          label="đơn hàng"
          onPageChange={(nextPage) => updateOrderQuery({ page: nextPage })}
        />
      )}
    </>
  );
}

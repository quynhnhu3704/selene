// frontend\src\pages\Account\Profile\components\OrdersPanel.jsx
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOrders } from "../../../../services/order.service";

const formatCurrency = (amount) =>
  Number(amount || 0).toLocaleString("vi-VN") + "đ";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("vi-VN");
};

const getStatusMeta = (status) => {
  const normalizedStatus = String(status || "pending").toLowerCase();

  const statuses = {
    unpaid: { label: "Chưa thanh toán", className: "text-bg-warning" },
    pending: { label: "Chờ xác nhận", className: "text-bg-secondary" },
    confirmed: { label: "Đã xác nhận", className: "text-bg-primary" },
    processing: { label: "Đang xử lý", className: "text-bg-primary" },
    shipping: { label: "Đang giao", className: "text-bg-warning" },
    delivered: { label: "Đã giao", className: "text-bg-success" },
    completed: { label: "Hoàn thành", className: "text-bg-success" },
    cancel: { label: "Đã hủy", className: "text-bg-danger" },
    cancelled: { label: "Đã hủy", className: "text-bg-danger" },
  };

  return (
    statuses[normalizedStatus] || {
      label: status || "Chờ xác nhận",
      className: "text-bg-secondary",
    }
  );
};

const paymentMethodLabel = {
  cod: "Thanh toán khi nhận hàng",
  bank: "Chuyển khoản ngân hàng",
  sepay: "SePay QR",
};

export default function OrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getOrders();
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      console.error("Không thể tải danh sách đơn hàng:", requestError);
      setError(
        requestError.response?.data?.message ||
          "Không thể tải danh sách đơn hàng. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <>
      <style>{`
        .my-orders-card { border: 1px solid #f0f0f0; border-radius: 12px; overflow: hidden; background: #fff; }
        .my-orders-card th { font-size: 11px; text-transform: uppercase; letter-spacing: .55px; color: #868e96; border-bottom-color: #f0f0f0; white-space: nowrap; }
        .my-orders-card td { font-size: 14px; border-bottom-color: #f5f5f5; vertical-align: middle; }
        .my-orders-card tbody tr:last-child td { border-bottom: 0; }
        .my-order-code { font-weight: 800; color: #212529; font-size: 13px; }
        .my-order-subtext { color: #868e96; font-size: 12px; margin-top: 3px; }
      `}</style>

      <h5 className="page-panel-title">ĐƠN HÀNG CỦA BẠN</h5>

      {loading ? (
        <div className="page-empty">
          <div className="spinner-border text-dark" role="status">
            <span className="visually-hidden">Đang tải đơn hàng</span>
          </div>
          <p className="mt-3 mb-0 text-muted" style={{ fontSize: 14 }}>
            Đang tải đơn hàng...
          </p>
        </div>
      ) : error ? (
        <div className="page-empty">
          <i className="bi bi-exclamation-circle page-empty-icon" />
          <p className="mt-3 mb-3 text-muted" style={{ fontSize: 14 }}>
            {error}
          </p>
          <button
            className="btn btn-dark px-4 form-btn fw-semibold"
            type="button"
            onClick={loadOrders}
          >
            Thử lại
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="page-empty">
          <i className="bi bi-bag-x page-empty-icon" />
          <p className="mt-3 mb-1 fw-semibold text-secondary">
            Bạn chưa có đơn hàng nào
          </p>
          <p className="text-muted" style={{ fontSize: 14 }}>
            Khám phá sản phẩm và đặt hàng ngay!
          </p>
          <Link
            to="/san-pham"
            className="btn btn-dark mt-3 px-4 form-btn fw-semibold"
          >
            Mua sắm ngay
          </Link>
        </div>
      ) : (
        <div className="my-orders-card table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-3 py-3">Mã đơn</th>
                <th className="px-3 py-3">Ngày đặt</th>
                <th className="px-3 py-3">Sản phẩm</th>
                <th className="px-3 py-3">Tổng tiền</th>
                <th className="px-3 py-3">Trạng thái</th>
                <th className="px-3 py-3" aria-label="Thao tác" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const status = getStatusMeta(order.status);
                const itemCount = (order.order_items || []).reduce(
                  (total, item) => total + Number(item.quantity || 0),
                  0,
                );

                return (
                  <tr key={order.order_id}>
                    <td className="px-3 py-3">
                      <div className="my-order-code">
                        #{order.order_code || order.order_id}
                      </div>
                      <div className="my-order-subtext">
                        {paymentMethodLabel[order.payment_method] ||
                          order.payment_method ||
                          "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      {itemCount ? `${itemCount} sản phẩm` : "—"}
                    </td>
                    <td className="px-3 py-3 fw-bold">
                      {formatCurrency(order.final_amount)}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`badge ${status.className}`}>
                        {status.label}
                      </span>
                      {order.payment_method !== "cod" && (
                        <div className="my-order-subtext">
                          {order.payment_status === "paid"
                            ? "Đã thanh toán"
                            : "Chờ thanh toán"}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-end">
                      {order.payment_method !== "cod" &&
                      order.payment_status !== "paid" ? (
                        <Link
                          to={`/thanh-toan/qr?orderId=${encodeURIComponent(
                            order.order_id,
                          )}`}
                          className="btn btn-sm btn-outline-dark rounded-pill px-3"
                          style={{ fontSize: 12, whiteSpace: "nowrap" }}
                        >
                          Thanh toán
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

import { Link } from "react-router-dom";

const ORDER_STATUSES = { pending: "Chờ xác nhận", confirmed: "Đã xác nhận", processing: "Đang xử lý", shipping: "Đang giao", delivered: "Đã giao", completed: "Hoàn thành", cancelled: "Đã hủy", unpaid: "Chưa thanh toán" };

export default function CustomerInfo({ customer, canViewOrder }) {
  return <aside className="support-customer-info">
    <h6 className="fw-bold mb-3">Thông tin khách hàng</h6>
    <p className="fw-semibold mb-2">{customer?.full_name || "Khách hàng"}</p>
    <p className="mb-2"><i className="bi bi-envelope me-2" />{customer?.email || "Chưa có email"}</p>
    <p><i className="bi bi-telephone me-2" />{customer?.phone_number || "Chưa có số điện thoại"}</p>
    <hr /><h6 className="fw-bold">Đơn hàng gần đây</h6>
    {customer?.orders_error && <p className="text-warning mt-3" role="alert">{customer.orders_error}</p>}
    {!customer?.orders_error && !customer?.orders?.length && <p className="text-muted mt-3">Chưa có đơn hàng.</p>}
    {customer?.orders?.map((order) => <div className="support-order" key={order.order_id}>
      {canViewOrder ? <Link to={`/admin/don-hang/${order.order_id}`} className="text-dark fw-semibold">#{order.order_code || order.order_id}</Link> :
        <strong>#{order.order_code || order.order_id}</strong>}
      <div className="text-muted mt-1">{new Date(order.created_at).toLocaleDateString("vi-VN")}</div>
      <div className="mt-1">{Number(order.final_amount || 0).toLocaleString("vi-VN")}đ</div>
      <div className="mt-1">{ORDER_STATUSES[order.status] || order.status}</div>
    </div>)}
  </aside>;
}

// frontend\src\pages\Account\Profile\components\OrdersPanel.jsx
import { Link } from "react-router-dom";

export default function OrdersPanel() {
  /* TODO: fetch đơn hàng từ API */
  const orders = []; // rỗng → empty state

  return (
    <>
      <h5 className="page-panel-title">ĐƠN HÀNG CỦA BẠN</h5>
      {orders.length === 0 ? (
        <div className="page-empty">
          <i className="bi bi-bag-x page-empty-icon" />
          <p className="mt-3 mb-1 fw-semibold text-secondary">Bạn chưa có đơn hàng nào</p>
          <p className="text-muted" style={{ fontSize: 14 }}>Khám phá sản phẩm và đặt hàng ngay!</p>
          <Link to="/san-pham" className="btn btn-dark mt-3 px-4 form-btn fw-semibold">Mua sắm ngay</Link>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead className="table-light">
              <tr>
                <th>Mã đơn</th>
                <th>Ngày đặt</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.date}</td>
                  <td>{o.total}</td>
                  <td><span className="badge bg-dark">{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
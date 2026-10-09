// frontend/src/pages/Admin/Orders/pages/Detail.jsx
import { useEffect, useState } from "react";
import AdminSelect from "../../components/AdminSelect";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";
import Loading from "../../../../components/common/Loading";
import {
  getAdminOrderDetail,
  updateAdminOrder,
} from "../../../../services/order.service";
import { getUser } from "../../../../utils/auth";
import defaultImage from "../../../../assets/images/default-product.png";
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  getOrderStatus,
  fmtVND,
  formatDate,
} from "../constants";

export default function OrderDetail({ readOnly = false }) {
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requestedReturn = params.get("returnUrl");
  const base = "/admin/don-hang";
  const back =
    requestedReturn === base || requestedReturn?.startsWith(base + "?")
      ? requestedReturn
      : base;
  const user = getUser();
  const isOwner = user?.role === "admin";
  const canEdit =
    ["admin", "staff"].includes(user?.role) &&
    user?.permissions?.includes("order:update");
  const editInformation = !readOnly && isOwner && canEdit;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const title = `${readOnly ? "Chi tiết" : "Chỉnh sửa"} đơn hàng`;

  // Prepare request state before committing a changed route/filter.
  const requestKey = JSON.stringify([orderId, readOnly]);
  const [previousRequestKey, setPreviousRequestKey] = useState(requestKey);
  if (previousRequestKey !== requestKey) {
    setPreviousRequestKey(requestKey);
    setLoading(true);
    setError("");
  }

  useEffect(() => {
    let isCurrentRequest = true;
    getAdminOrderDetail(orderId)
      .then(({ data }) => {
        if (isCurrentRequest)
          setOrder({
            ...data,
            status: data.status === "cancel" ? "cancelled" : data.status,
          });
      })
      .catch((err) => {
        if (isCurrentRequest)
          setError(
            err.response?.data?.message || "Không thể tải chi tiết đơn hàng!",
          );
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });
    return () => {
      isCurrentRequest = false;
    };
  }, [orderId, readOnly]);

  const changeField = (key, value) =>
    setOrder((previous) => ({ ...previous, [key]: value }));

  const changeItem = (itemId, key, value) => {
    setOrder((previous) => ({
      ...previous,
      order_items: previous.order_items.map((item) =>
        item.order_item_id === itemId ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving || readOnly || !canEdit) return;
    const data = { status: order.status, updated_at: order.updated_at };
    if (isOwner) {
      [
        "recipient_name",
        "recipient_phone",
        "recipient_address",
        "payment_method",
        "payment_status",
        "total_discount_price",
        "shipping_fee",
      ].forEach((key) => {
        data[key] = order[key];
      });
      data.order_items = (order.order_items || []).map((item) => ({
        order_item_id: item.order_item_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));
    }
    setSaving(true);
    try {
      const result = await updateAdminOrder(orderId, data);
      toast.success(result.message || "Cập nhật đơn hàng thành công!");
      navigate(back);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Không thể cập nhật đơn hàng!",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "60vh" }}
      >
        <Loading text="Đang tải đơn hàng..." />
      </div>
    );
  if (error || !order || (!readOnly && !canEdit))
    return (
      <>
        <div className="alert alert-danger">
          {error || "Bạn không có quyền chỉnh sửa đơn hàng!"}
        </div>
        <Link to={back}>Quay lại danh sách</Link>
      </>
    );

  const state = getOrderStatus(order.status);
  const subtotal = editInformation
    ? (order.order_items || []).reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
        0,
      )
    : Number(order.total_original_price || 0);
  const total =
    subtotal -
    Number(order.total_discount_price || 0) +
    Number(order.shipping_fee || 0);
  const fields = [
    ["recipient_name", "Khách hàng / Người nhận", "text"],
    ["recipient_phone", "Số điện thoại", "tel"],
    ["recipient_address", "Địa chỉ nhận hàng", "text"],
  ];

  return (
    <>
      <Helmet>
        <title>{title} | Selene</title>
      </Helmet>
      <div className="adm-page-head">
        <div className="adm-page-title">{title}</div>
        <Link className="form-btn btn btn-outline-dark" to={back}>
          <i className="bi bi-arrow-left me-2" />
          Quay lại
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-3 p-4 border">
        <fieldset disabled={saving}>
          <div className="row g-4">
            <div className="col-md-6">
              <div className="form-label fw-semibold">Mã đơn</div>
              <div>{order.order_code}</div>
            </div>
            <div className="col-md-6">
              <div className="form-label fw-semibold">Ngày đặt</div>
              <div>{formatDate(order.created_at)}</div>
            </div>
            {fields.map(([key, label, type]) => (
              <div
                className={key === "recipient_address" ? "col-12" : "col-md-6"}
                key={key}
              >
                <label htmlFor={key} className="form-label fw-semibold">
                  {label}
                  {editInformation ? " *" : ""}
                </label>
                {editInformation ? (
                  <input
                    id={key}
                    className="form-control"
                    type={type}
                    required
                    value={order[key] || ""}
                    pattern={
                      key === "recipient_phone" ? "0[0-9]{9}" : undefined
                    }
                    onChange={(e) => changeField(key, e.target.value)}
                  />
                ) : (
                  <div>{order[key] || "—"}</div>
                )}
              </div>
            ))}
            <div className="col-md-6">
              <label htmlFor="status" className="form-label fw-semibold">
                Trạng thái đơn hàng
              </label>
              {readOnly ? (
                <div>
                  <span
                    className={`adm-status rounded-pill w-auto text-${state.color} bg-${state.color}-subtle`}
                  >
                    {state.label}
                  </span>
                </div>
              ) : (
                <AdminSelect
                  id="status"
                  value={order.status}
                  onChange={(e) => changeField("status", e.target.value)}
                  required
                >
                  {!ORDER_STATUSES.some(
                    (item) => item.key === order.status,
                  ) && (
                    <option value={order.status} disabled>
                      {order.status}
                    </option>
                  )}
                  {ORDER_STATUSES.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </AdminSelect>
              )}
            </div>
            {[
              ["payment_method", "Phương thức thanh toán", PAYMENT_METHODS],
              ["payment_status", "Trạng thái thanh toán", PAYMENT_STATUSES],
            ].map(([key, label, options]) => (
              <div className="col-md-6" key={key}>
                <label htmlFor={key} className="form-label fw-semibold">
                  {label}
                </label>
                {editInformation ? (
                  <AdminSelect
                    id={key}
                    value={order[key]}
                    onChange={(e) => changeField(key, e.target.value)}
                    required
                  >
                    {options.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </AdminSelect>
                ) : (
                  <div>
                    {options.find((item) => item.key === order[key])?.label ||
                      order[key] ||
                      "—"}
                  </div>
                )}
              </div>
            ))}
            <div className="col-12">
              <div className="form-label fw-semibold">Sản phẩm trong đơn</div>
              <div className="adm-table-wrap table-responsive">
                <table className="table adm-table mb-0">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th className="text-center">Số lượng</th>
                      <th className="text-end">Đơn giá</th>
                      <th className="text-end">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.order_items || []).map((item) => (
                      <tr key={item.order_item_id}>
                        <td>
                          <div className="adm-cell">
                            <img
                              className="adm-thumb"
                              src={item.image_url || defaultImage}
                              alt=""
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = defaultImage;
                              }}
                            />
                            <div>
                              <div className="adm-name">
                                {item.product_name}
                              </div>
                              <div className="adm-sub">
                                {[item.color, item.size]
                                  .filter(Boolean)
                                  .join(" / ") || "—"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          {editInformation ? (
                            <input
                              className="form-control text-center"
                              aria-label={`Số lượng ${item.product_name}`}
                              type="number"
                              min="1"
                              max="2147483647"
                              step="1"
                              required
                              value={item.quantity}
                              onChange={(e) =>
                                changeItem(
                                  item.order_item_id,
                                  "quantity",
                                  e.target.value,
                                )
                              }
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td className="text-end">
                          {editInformation ? (
                            <input
                              className="form-control text-end"
                              aria-label={`Đơn giá ${item.product_name}`}
                              type="number"
                              min="0"
                              step="1"
                              required
                              value={item.unit_price}
                              onChange={(e) =>
                                changeItem(
                                  item.order_item_id,
                                  "unit_price",
                                  e.target.value,
                                )
                              }
                            />
                          ) : (
                            fmtVND(item.unit_price)
                          )}
                        </td>
                        <td className="text-end fw-semibold">
                          {fmtVND(
                            Number(item.quantity) * Number(item.unit_price),
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="col-md-4">
              <div className="form-label fw-semibold">Tiền hàng</div>
              <div>{fmtVND(subtotal)}</div>
            </div>
            {[
              ["total_discount_price", "Giảm giá"],
              ["shipping_fee", "Phí giao hàng"],
            ].map(([key, label]) => (
              <div className="col-md-4" key={key}>
                <label htmlFor={key} className="form-label fw-semibold">
                  {label}
                </label>
                {editInformation ? (
                  <input
                    id={key}
                    className="form-control"
                    type="number"
                    min="0"
                    step="1"
                    max={key === "total_discount_price" ? subtotal : undefined}
                    required
                    value={order[key] ?? 0}
                    onChange={(e) => changeField(key, e.target.value)}
                  />
                ) : (
                  <div>{fmtVND(order[key])}</div>
                )}
              </div>
            ))}
            <div className="col-12 text-end fw-bold">
              Tổng tiền: {fmtVND(editInformation ? total : order.final_amount)}
            </div>
          </div>
          <div className="d-flex justify-content-end gap-3 mt-4">
            {!readOnly ? (
              <>
                <Link
                  className="form-btn btn btn-outline-dark fw-semibold"
                  to={back}
                >
                  Hủy
                </Link>
                <button
                  className="form-btn btn btn-dark fw-semibold"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </>
            ) : (
              canEdit && (
                <Link
                  className="form-btn btn btn-dark fw-semibold"
                  to={`${base}/${encodeURIComponent(orderId)}/sua?returnUrl=${encodeURIComponent(back)}`}
                >
                  Chỉnh sửa đơn hàng
                </Link>
              )
            )}
          </div>
        </fieldset>
      </form>
    </>
  );
}

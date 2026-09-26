import Loading from "../../../../components/common/Loading";
import AdminSelect from "../../components/AdminSelect";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";
import { getAdminCustomers } from "../../../../services/user.service";
import {
  getProducts,
  getProductById,
} from "../../../../services/product.service";
import { createAdminOrder } from "../../../../services/order.service";
import { getUser } from "../../../../utils/auth";
import { PAYMENT_METHODS, fmtVND } from "../constants";

export default function CreateOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    account_id: "",
    recipient_name: "",
    recipient_phone: "",
    recipient_address: "",
    payment_method: "cod",
    shipping_fee: 0,
    total_discount_price: 0,
  });
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState(null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [error, setError] = useState("");
  const user = getUser();
  const canCreate =
    ["admin", "staff"].includes(user?.role) &&
    user?.permissions?.includes("order:create");
  useEffect(() => {
    if (!canCreate) return;
    let current = true;
    const timer = setTimeout(() => {
      getAdminCustomers({ q: customerQuery, status: "active", limit: 100 })
        .then(({ data }) => {
          if (current) setCustomers(data.data);
        })
        .catch(() => {
          if (current)
            toast.error(
              "Không thể tải khách hàng. Kiểm tra quyền xem khách hàng.",
            );
        });
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [customerQuery, canCreate]);
  useEffect(() => {
    if (!canCreate) return;
    let current = true;
    const timer = setTimeout(() => {
      getProducts({ q: productQuery, limit: 100 })
        .then(({ data }) => {
          if (current) setProducts(data);
        })
        .catch(() => {
          if (current) toast.error("Không thể tải sản phẩm!");
        });
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [productQuery, canCreate]);
  const change = (key, value) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const selectProduct = async (id) => {
    setProduct(null);
    if (!id) return;
    setLoadingProduct(true);
    try {
      const { data } = await getProductById(id);
      setProduct(data);
    } catch {
      toast.error("Không thể tải biến thể sản phẩm!");
    } finally {
      setLoadingProduct(false);
    }
  };
  const addItem = (variant) => {
    if (items.some((item) => item.variant_id === variant.variant_id)) return;
    setItems([
      ...items,
      {
        ...variant,
        product_name: product.product_name,
        unit_price: Number(
          product.discount_price || product.original_price || 0,
        ),
        quantity: 1,
      },
    ]);
  };
  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price * Number(item.quantity),
    0,
  );
  const submit = async (event) => {
    event.preventDefault();
    if (saving || !canCreate) return;
    if (!items.length) {
      setError("Vui lòng thêm ít nhất một sản phẩm!");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await createAdminOrder({
        ...form,
        shipping_fee: Number(form.shipping_fee),
        total_discount_price: Number(form.total_discount_price),
        order_items: items.map(({ variant_id, quantity }) => ({
          variant_id,
          quantity: Number(quantity),
        })),
      });
      toast.success("Tạo đơn hàng thành công!");
      navigate(`/admin/don-hang/${encodeURIComponent(data.order_id)}`);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tạo đơn hàng!");
    } finally {
      setSaving(false);
    }
  };
  if (!canCreate)
    return (
      <div className="alert alert-danger">
        Bạn không có quyền thêm đơn hàng.
      </div>
    );
  return (
    <>
      <Helmet>
        <title>Thêm đơn hàng | Selene</title>
      </Helmet>
      <div className="adm-page-head">
        <div className="adm-page-title">Thêm đơn hàng</div>
        <Link className="form-btn btn btn-outline-dark" to="/admin/don-hang">
          Quay lại
        </Link>
      </div>
      <form onSubmit={submit} className="bg-white rounded-3 p-4 border">
        {error && (
          <div role="alert" className="alert alert-danger">
            {error}
          </div>
        )}
        <fieldset disabled={saving}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="customer-search">
                Tìm khách hàng
              </label>
              <input
                id="customer-search"
                className="form-control"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Tên, email hoặc số điện thoại"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="customer">
                Khách hàng *
              </label>
              <AdminSelect
                id="customer"
                required
                value={form.account_id}
                onChange={(e) => {
                  const customer = customers.find(
                    (row) => row.account_id === e.target.value,
                  );
                  setForm((previous) => ({
                    ...previous,
                    account_id: e.target.value,
                    profile_id: customer?.profile_id || "",
                    recipient_name: customer?.full_name || "",
                    recipient_phone: customer?.phone_number || "",
                  }));
                }}
              >
                <option value="">Chọn khách hàng</option>
                {form.account_id &&
                  !customers.some(
                    (row) => row.account_id === form.account_id,
                  ) && (
                    <option value={form.account_id}>
                      {form.recipient_name}
                    </option>
                  )}
                {customers.map((row) => (
                  <option key={row.account_id} value={row.account_id}>
                    {row.full_name} — {row.email || row.phone_number}
                  </option>
                ))}
              </AdminSelect>
            </div>
            {[
              ["recipient_name", "Người nhận", "text"],
              ["recipient_phone", "Số điện thoại", "tel"],
              ["recipient_address", "Địa chỉ nhận hàng", "text"],
            ].map(([key, label, type]) => (
              <div
                key={key}
                className={key === "recipient_address" ? "col-12" : "col-md-6"}
              >
                <label htmlFor={key} className="form-label">
                  {label} *
                </label>
                <input
                  id={key}
                  className="form-control"
                  required
                  type={type}
                  pattern={type === "tel" ? "0[0-9]{9}" : undefined}
                  value={form[key]}
                  onChange={(e) => change(key, e.target.value)}
                />
              </div>
            ))}
            <div className="col-md-6">
              <label htmlFor="product-search" className="form-label">
                Tìm sản phẩm
              </label>
              <input
                id="product-search"
                className="form-control"
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setProduct(null);
                }}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="product" className="form-label">
                Chọn sản phẩm
              </label>
              <AdminSelect
                id="product"
                disabled={loadingProduct}
                value={product?.product_id || ""}
                onChange={(e) => selectProduct(e.target.value)}
              >
                <option value="">Chọn sản phẩm</option>
                {products.map((row) => (
                  <option key={row.product_id} value={row.product_id}>
                    {row.product_name}
                  </option>
                ))}
              </AdminSelect>
            </div>
            {loadingProduct && <Loading text="Đang tải biến thể..." />}
            {product && (
              <div className="col-12 d-flex gap-2 flex-wrap">
                {product.variants?.map((variant) => (
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    key={variant.variant_id}
                    disabled={
                      Number(variant.stock_quantity) < 1 ||
                      items.some(
                        (item) => item.variant_id === variant.variant_id,
                      )
                    }
                    onClick={() => addItem(variant)}
                  >
                    {variant.size} / {variant.color} — Còn{" "}
                    {variant.stock_quantity} <i className="bi bi-plus" />
                  </button>
                ))}
              </div>
            )}
            <div className="col-12 table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Đơn giá</th>
                    <th>Số lượng</th>
                    <th>Thành tiền</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.variant_id}>
                      <td>
                        {item.product_name}
                        <div className="text-muted">
                          {item.size} / {item.color}
                        </div>
                      </td>
                      <td>{fmtVND(item.unit_price)}</td>
                      <td>
                        <input
                          className="form-control"
                          style={{ width: 100 }}
                          aria-label={`Số lượng ${item.product_name} ${item.size} ${item.color}`}
                          required
                          type="number"
                          min="1"
                          max={item.stock_quantity}
                          step="1"
                          value={item.quantity}
                          onChange={(e) =>
                            setItems(
                              items.map((row) =>
                                row.variant_id === item.variant_id
                                  ? { ...row, quantity: e.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>{fmtVND(item.unit_price * Number(item.quantity))}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          aria-label={`Xóa ${item.product_name}`}
                          onClick={() =>
                            setItems(
                              items.filter(
                                (row) => row.variant_id !== item.variant_id,
                              ),
                            )
                          }
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!items.length && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted">
                        Chọn sản phẩm và biến thể để thêm vào đơn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="payment_method">
                Thanh toán
              </label>
              <AdminSelect
                id="payment_method"
                value={form.payment_method}
                onChange={(e) => change("payment_method", e.target.value)}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.key} value={method.key}>
                    {method.label}
                  </option>
                ))}
              </AdminSelect>
            </div>
            {[
              ["shipping_fee", "Phí vận chuyển"],
              ["total_discount_price", "Giảm giá"],
            ].map(([key, label]) => (
              <div className="col-md-4" key={key}>
                <label className="form-label" htmlFor={key}>
                  {label}
                </label>
                <input
                  id={key}
                  className="form-control"
                  required
                  type="number"
                  min="0"
                  max={key === "total_discount_price" ? subtotal : undefined}
                  step="1"
                  value={form[key]}
                  onChange={(e) => change(key, e.target.value)}
                />
              </div>
            ))}
            <div className="col-12 text-end">
              <p className="fw-bold">
                Tổng tiền:{" "}
                {fmtVND(
                  subtotal -
                    Number(form.total_discount_price) +
                    Number(form.shipping_fee),
                )}
              </p>
              <button
                className="form-btn btn btn-dark"
                type="submit"
                disabled={saving || !items.length}
              >
                {saving ? "Đang lưu..." : "Tạo đơn hàng"}
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </>
  );
}

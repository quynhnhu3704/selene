import AdminSaveButton from "../../components/AdminSaveButton";
import AdminSelect from "../../components/AdminSelect";
import { useEffect, useRef, useState } from "react";
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
import defaultImage from "../../../../assets/images/default-product.png";
import "../create-order.css";

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
  const [customerSearchState, setCustomerSearchState] = useState("loading");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [productSearchState, setProductSearchState] = useState("loading");
  const [product, setProduct] = useState(null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const productRequest = useRef(0);
  const [error, setError] = useState("");
  const user = getUser();
  const canCreate =
    ["admin", "staff"].includes(user?.role) &&
    user?.permissions?.includes("order:create");
  useEffect(() => {
    if (!canCreate) return;
    let current = true;
    const timer = setTimeout(() => {
      getAdminCustomers({ q: customerQuery, status: "active", limit: 100, include_order_counts: false })
        .then(({ data }) => {
          if (current) {
            setCustomers(data.data);
            setCustomerSearchState("ready");
          }
        })
        .catch(() => {
          if (current) {
            setCustomers([]);
            setCustomerSearchState("error");
            toast.error(
              "Không thể tải khách hàng. Kiểm tra quyền xem khách hàng.",
            );
          }
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
      getProducts({ q: productQuery.trim(), limit: 100 })
        .then(({ data }) => {
          if (current) {
            setProducts(data);
            setProductSearchState("ready");
          }
        })
        .catch(() => {
          if (current) {
            setProducts([]);
            setProductSearchState("error");
            toast.error("Không thể tải sản phẩm!");
          }
        });
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [productQuery, canCreate]);
  const change = (key, value) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const chooseCustomer = (customer) => {
    setSelectedCustomer(customer || null);
    setForm((previous) => ({
      ...previous,
      account_id: customer?.account_id || "",
      profile_id: customer?.profile_id || "",
      recipient_name: customer?.full_name || "",
      recipient_phone: customer?.phone_number || "",
    }));
    setCustomerQuery("");
  };
  const selectProduct = async (id) => {
    const request = ++productRequest.current;
    setSelectedProductId(id);
    setProduct(null);
    if (!id) return;
    try {
      const { data } = await getProductById(id);
      if (request === productRequest.current) setProduct(data);
    } catch {
      if (request === productRequest.current) {
        setSelectedProductId("");
        toast.error("Không thể tải biến thể sản phẩm!");
      }
    }
  };
  const addItem = (variant) => {
    if (items.some((item) => item.variant_id === variant.variant_id)) return;
    setItems([
      ...items,
      {
        ...variant,
        product_name: product.product_name,
        image_url: product.images?.[0] || defaultImage,
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
      <div className="adm-form-head adm-page-head">
        <div className="adm-page-title">Thêm đơn hàng</div>
        <div className="d-flex flex-wrap gap-2">
          <Link className="form-btn btn btn-outline-dark" to="/admin/don-hang">
            <i className="bi bi-arrow-left me-2" aria-hidden="true" />
            Quay lại
          </Link>
          <AdminSaveButton type="submit" form="create-order-form" disabled={!items.length} saving={saving}>
            Thêm mới
          </AdminSaveButton>
        </div>
      </div>
      <form onSubmit={submit} id="create-order-form">
        {error && (
          <div role="alert" className="alert alert-danger">
            {error}
          </div>
        )}
        <fieldset disabled={saving}>
          <section className="edit-section">
            <h2 className="edit-section-title">
              <i className="bi bi-person" />
              Thông tin người nhận
            </h2>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="customer-search">
                  Tìm khách hàng
                </label>
                <input
                  id="customer-search"
                  className="form-control"
                  value={customerQuery}
                  onChange={(e) => {
                    setCustomerQuery(e.target.value);
                    setCustomerSearchState("loading");
                  }}
                  placeholder="Tên, email hoặc số điện thoại"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="customer">
                  Khách hàng <span className="text-danger">*</span>
                </label>
                <AdminSelect
                  id="customer"
                  required
                  disabled={customerSearchState !== "ready"}
                  value={form.account_id}
                  onChange={(e) => {
                    const customer = [selectedCustomer, ...customers].find(
                      (row) => row?.account_id === e.target.value,
                    );
                    chooseCustomer(customer);
                  }}
                >
                  <option value="">
                    {customerSearchState === "loading" ? "Đang tìm khách hàng..." : customerSearchState === "error" ? "Không thể tải khách hàng" : customers.length === 0 ? "Không tìm thấy khách hàng" : "Chọn khách hàng"}
                  </option>
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
                  className={
                    key === "recipient_address" ? "col-12" : "col-md-6"
                  }
                >
                  <label htmlFor={key} className="form-label">
                    {label} <span className="text-danger">*</span>
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
            </div>
          </section>
          <section className="edit-section">
            <h2 className="edit-section-title">
              <i className="bi bi-bag" />
              Sản phẩm trong đơn
            </h2>
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="product-search" className="form-label">
                  Tìm sản phẩm
                </label>
                <input
                  id="product-search"
                  className="form-control"
                  placeholder="Nhập tên hoặc mã sản phẩm"
                  value={productQuery}
                  onChange={(e) => {
                    setProductQuery(e.target.value);
                    setProductSearchState("loading");
                    setProducts([]);
                    ++productRequest.current;
                    setSelectedProductId("");
                    setProduct(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (productSearchState === "ready" && products.length === 1) {
                        selectProduct(products[0].product_id);
                      }
                    }
                  }}
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="product" className="form-label">
                  Chọn sản phẩm
                </label>
                <AdminSelect
                  id="product"
                  disabled={productSearchState !== "ready" || products.length === 0}
                  value={selectedProductId}
                  onChange={(e) => selectProduct(e.target.value)}
                >
                  <option value="">
                    {productSearchState === "loading" ? "Đang tìm sản phẩm..." : productSearchState === "error" ? "Không thể tải sản phẩm" : products.length === 0 ? "Không tìm thấy sản phẩm" : "Chọn sản phẩm"}
                  </option>
                  {products.map((row) => (
                    <option key={row.product_id} value={row.product_id}>
                      {row.product_name}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              {product && (
                <div className="col-12 d-flex gap-2 flex-wrap">
                  {product.variants?.map((variant) => (
                    <button
                      type="button"
                      className="form-btn btn btn-outline-dark mb-0"
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
                      {variant.stock_quantity} <i className="bi bi-plus-lg" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
              <div className="col-12">
                <div className="adm-table-wrap table-responsive">
                <table className="table adm-table adm-create-order-table mb-0">
                  <thead>
                    <tr>
                      <th className="text-center" aria-label="Số thứ tự" />
                      <th>Sản phẩm</th>
                      <th className="text-end">Đơn giá</th>
                      <th className="text-center">Số lượng</th>
                      <th className="text-end">Thành tiền</th>
                      <th><span className="visually-hidden">Thao tác</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.variant_id}>
                        <td className="text-center">
                          <span className="adm-stt">{index + 1}</span>
                        </td>
                        <td>
                          <div className="adm-cell">
                            <img
                              className="adm-thumb"
                              src={item.image_url}
                              alt=""
                              onError={(event) => {
                                if (event.currentTarget.getAttribute("src") !== defaultImage) {
                                  event.currentTarget.src = defaultImage;
                                }
                              }}
                            />
                            <div>
                              <div className="adm-name">{item.product_name}</div>
                              <div className="adm-sub">
                                {[item.size, item.color].filter(Boolean).join(" / ")}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-end text-nowrap adm-price">{fmtVND(item.unit_price)}</td>
                        <td>
                          <input
                            className="form-control text-center mx-auto adm-order-quantity"
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
                        <td className="text-end text-nowrap adm-price">
                          {fmtVND(item.unit_price * Number(item.quantity))}
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="adm-action-btn lock ms-auto"
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
                        <td colSpan="6" className="text-center text-muted">
                          Chọn sản phẩm và biến thể để thêm vào đơn.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </section>
          <section className="edit-section">
            <h2 className="edit-section-title">
              <i className="bi bi-credit-card" />
              Thanh toán
            </h2>
            <div className="row g-3">
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
              </div>
            </div>
          </section>
        </fieldset>
      </form>
    </>
  );
}

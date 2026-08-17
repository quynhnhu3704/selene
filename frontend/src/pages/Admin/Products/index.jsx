// frontend\src\pages\Admin\Products\index.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminProducts } from "../../../services/product.service";

const fmtVND = (n) => n.toLocaleString("vi-VN") + "đ";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total_items: 0,
    total_pages: 0,
  });

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const res = await getAdminProducts(page, 10);

      setProducts(res.data?.products || []);

      setPagination(
        res.data?.pagination || {
          page: 1,
          limit: 10,
          total_items: 0,
          total_pages: 0,
        },
      );
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sản phẩm:", error);

      setError(
        error.response?.data?.message || "Không thể tải danh sách sản phẩm!",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = products.filter((p) =>
    p.product_name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <style>{`
        .adm-table-card { background: #fff; border-radius: 14px; border: 1px solid #f0f0f0; overflow: hidden; }
        .adm-table-head { padding: 18px 22px; border-bottom: 1px solid #f5f5f5; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .adm-page-title { font-size: 15px; font-weight: 800; color: #212529; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px; }
        .adm-table th  { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #adb5bd; border-bottom: 1px solid #f0f0f0 !important; padding: 12px 16px; white-space: nowrap; }
        .adm-table td  { font-size: 14px; color: #212529; border-color: #f8f8f8 !important; padding: 13px 16px; vertical-align: middle; }
        .adm-table tbody tr:hover { background: #fafafa; }
        .adm-action-btn { background: none; border: none; padding: 5px 8px; border-radius: 7px; cursor: pointer; font-size: 15px; transition: background 0.15s; }
        .adm-action-btn:hover { background: #f0f0f0; }
        .adm-sku { font-size: 12px; color: #adb5bd; font-weight: 600; }
      `}</style>

      <div className="adm-page-title">Quản lý sản phẩm</div>

      <div className="adm-table-card">
        {/* toolbar */}
        <div className="adm-table-head">
          <div className="input-group" style={{ maxWidth: 280 }}>
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted" style={{ fontSize: 14 }} />
            </span>
            <input
              className="form-control border-start-0 ps-0"
              placeholder="Tìm tên sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>

          <div className="ms-auto">
            <Link
              to="/admin/san-pham/them-moi"
              className="btn btn-dark form-btn fw-semibold"
            >
              <i className="bi bi-plus-lg me-1" />
              Thêm sản phẩm
            </Link>
          </div>
        </div>

        {/* table */}
        <div className="table-responsive">
          <table className="table adm-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Sản phẩm</th>
                <th>Danh mục</th>
                <th>Giá</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center text-muted py-5"
                    style={{ fontSize: 14 }}
                  >
                    Đang tải danh sách sản phẩm...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center text-danger py-5"
                    style={{ fontSize: 14 }}
                  >
                    {error}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center text-muted py-5"
                    style={{ fontSize: 14 }}
                  >
                    <i
                      className="bi bi-inbox"
                      style={{
                        fontSize: 32,
                        display: "block",
                        marginBottom: 8,
                        opacity: 0.3,
                      }}
                    />
                    Không tìm thấy sản phẩm
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => {
                  const statusMap = {
                    active: {
                      bg: "success",
                      text: "Đang bán",
                    },
                    inactive: {
                      bg: "danger",
                      text: "Ngừng bán",
                    },
                  };

                  const status = statusMap[p.status] || {
                    bg: "secondary",
                    text: p.status || "Không xác định",
                  };

                  return (
                    <tr key={p.product_id}>
                      <td className="text-muted" style={{ fontSize: 13 }}>
                        {idx + 1}
                      </td>

                      <td>
                        <div className="fw-semibold" style={{ fontSize: 14 }}>
                          {p.product_name}
                        </div>

                        <div className="adm-sku">{p.product_id}</div>
                      </td>

                      <td>{p.category_name || "—"}</td>

                      <td className="fw-semibold">
                        {fmtVND(p.discount_price || p.price || 0)}
                      </td>

                      <td>—</td>

                      <td>
                        <span
                          className={`badge bg-${status.bg} bg-opacity-10 text-${status.bg} fw-semibold`}
                          style={{
                            fontSize: 12,
                            padding: "5px 10px",
                            borderRadius: 8,
                          }}
                        >
                          {status.text}
                        </span>
                      </td>

                      <td>
                        <div className="d-flex gap-1">
                          <Link
                            to={`/admin/san-pham/${p.product_id}`}
                            className="adm-action-btn text-muted"
                            title="Xem"
                          >
                            <i className="bi bi-eye" />
                          </Link>

                          <Link
                            to={`/admin/san-pham/${p.product_id}/sua`}
                            className="adm-action-btn text-muted"
                            title="Sửa"
                          >
                            <i className="bi bi-pencil" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* footer count */}
        <div
          className="px-4 py-3 border-top"
          style={{ fontSize: 13, color: "#adb5bd" }}
        >
          Hiển thị {filtered.length} / {pagination.total_items} sản phẩm
        </div>
      </div>
    </>
  );
}

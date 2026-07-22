// frontend\src\pages\Admin\Products\index.jsx
import { useState } from "react";
import { Link } from "react-router-dom";

/* ── DỮ LIỆU MẪU ── */
const INIT = [
  { id: 1, sku: "RR26AK53", name: "Áo Kiểu Nữ Nami Top",    category: "Áo Nữ",   price: 440000, stock: 128, status: "Đang bán" },
  { id: 2, sku: "RR26QJ10", name: "Quần Jeans Nữ Eric",      category: "Quần Nữ", price: 620000, stock: 54,  status: "Đang bán" },
  { id: 3, sku: "RR26DL04", name: "Đầm Linen Nữ Calla",      category: "Đầm",     price: 750000, stock: 0,   status: "Hết hàng" },
  { id: 4, sku: "RR26SD05", name: "Set Đồ Nữ Coco",          category: "Set Đồ",  price: 820000, stock: 31,  status: "Đang bán" },
  { id: 5, sku: "RR26JS07", name: "Jumpsuit Nữ Rena",         category: "Jumpsuit", price: 540000, stock: 17, status: "Đang bán" },
  { id: 6, sku: "RR26VD05", name: "Váy Dài Linie Skirt",      category: "Váy",     price: 630000, stock: 0,   status: "Ngừng bán" },
];

const fmtVND = (n) => n.toLocaleString("vi-VN") + "đ";

const STATUS_COLOR = {
  "Đang bán":  { bg: "success", text: "Đang bán" },
  "Hết hàng":  { bg: "warning", text: "Hết hàng" },
  "Ngừng bán": { bg: "danger",  text: "Ngừng bán" },
};

export default function AdminProducts() {
  const [products, setProducts] = useState(INIT);
  const [search, setSearch]     = useState("");
  const [filterCat, setFilterCat] = useState("all");

  const categories = ["all", ...new Set(INIT.map(p => p.category))];

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat    = filterCat === "all" || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const handleDelete = (id) => {
    if (!window.confirm("Xoá sản phẩm này?")) return;
    setProducts(prev => prev.filter(p => p.id !== id));
  };

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
              placeholder="Tìm tên hoặc SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>

          <select className="form-select" style={{ maxWidth: 160, fontSize: 14 }}
            value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            {categories.map(c => (
              <option key={c} value={c}>{c === "all" ? "Tất cả danh mục" : c}</option>
            ))}
          </select>

          <div className="ms-auto">
            <Link to="/admin/san-pham/them-moi" className="btn btn-dark form-btn fw-semibold">
              <i className="bi bi-plus-lg me-1" />Thêm sản phẩm
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-5" style={{ fontSize: 14 }}>
                    <i className="bi bi-inbox" style={{ fontSize: 32, display: "block", marginBottom: 8, opacity: 0.3 }} />
                    Không tìm thấy sản phẩm
                  </td>
                </tr>
              ) : filtered.map((p, idx) => {
                const s = STATUS_COLOR[p.status];
                return (
                  <tr key={p.id}>
                    <td className="text-muted" style={{ fontSize: 13 }}>{idx + 1}</td>
                    <td>
                      <div className="fw-semibold" style={{ fontSize: 14 }}>{p.name}</div>
                      <div className="adm-sku">{p.sku}</div>
                    </td>
                    <td>{p.category}</td>
                    <td className="fw-semibold">{fmtVND(p.price)}</td>
                    <td>
                      <span style={{ color: p.stock === 0 ? "#871B1B" : "#212529", fontWeight: 600 }}>
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      <span className={`badge bg-${s.bg} bg-opacity-10 text-${s.bg} fw-semibold`}
                        style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8 }}>
                        {s.text}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <Link to={`/admin/san-pham/${p.id}`} className="adm-action-btn text-muted" title="Xem">
                          <i className="bi bi-eye" />
                        </Link>
                        <Link to={`/admin/san-pham/${p.id}/sua`} className="adm-action-btn text-muted" title="Sửa">
                          <i className="bi bi-pencil" />
                        </Link>
                        <button className="adm-action-btn text-danger" title="Xoá" onClick={() => handleDelete(p.id)}>
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* footer count */}
        <div className="px-4 py-3 border-top" style={{ fontSize: 13, color: "#adb5bd" }}>
          Hiển thị {filtered.length} / {products.length} sản phẩm
        </div>
      </div>
    </>
  );
}
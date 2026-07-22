// frontend\src\pages\Admin\Orders\index.jsx
import { useState } from "react";

const INIT = [
  { id: "#ORD-1024", customer: "Nguyễn Thị Mai",   email: "mai@gmail.com",   total: 620000,  items: 2, status: "Đang giao",    date: "22/07/2026" },
  { id: "#ORD-1023", customer: "Trần Văn Bình",     email: "binh@gmail.com",  total: 1240000, items: 4, status: "Đã giao",      date: "21/07/2026" },
  { id: "#ORD-1022", customer: "Lê Hoàng Anh",      email: "anh@gmail.com",   total: 480000,  items: 1, status: "Chờ xác nhận", date: "21/07/2026" },
  { id: "#ORD-1021", customer: "Phạm Thị Lan",      email: "lan@gmail.com",   total: 850000,  items: 3, status: "Đã giao",      date: "20/07/2026" },
  { id: "#ORD-1020", customer: "Võ Minh Khoa",      email: "khoa@gmail.com",  total: 390000,  items: 1, status: "Đã huỷ",      date: "20/07/2026" },
  { id: "#ORD-1019", customer: "Ngô Thị Hương",     email: "huong@gmail.com", total: 710000,  items: 2, status: "Đang giao",    date: "19/07/2026" },
];

const STATUS_OPTIONS = ["Tất cả", "Chờ xác nhận", "Đang giao", "Đã giao", "Đã huỷ"];

const STATUS_COLOR = {
  "Chờ xác nhận": { bg: "secondary", label: "Chờ xác nhận" },
  "Đang giao":    { bg: "warning",   label: "Đang giao" },
  "Đã giao":      { bg: "success",   label: "Đã giao" },
  "Đã huỷ":      { bg: "danger",    label: "Đã huỷ" },
};

const fmtVND = (n) => n.toLocaleString("vi-VN") + "đ";

export default function AdminOrders() {
  const [orders, setOrders]   = useState(INIT);
  const [search, setSearch]   = useState("");
  const [filterStatus, setFS] = useState("Tất cả");
  const [editId, setEditId]   = useState(null);
  const [editStatus, setES]   = useState("");

  const filtered = orders.filter(o => {
    const matchS = o.customer.toLowerCase().includes(search.toLowerCase()) ||
                   o.id.toLowerCase().includes(search.toLowerCase());
    const matchF = filterStatus === "Tất cả" || o.status === filterStatus;
    return matchS && matchF;
  });

  const saveStatus = (id) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: editStatus } : o));
    setEditId(null);
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
        .adm-cust-email { font-size: 12px; color: #adb5bd; font-weight: 500; }
      `}</style>

      <div className="adm-page-title">Quản lý đơn hàng</div>

      <div className="adm-table-card">
        {/* toolbar */}
        <div className="adm-table-head">
          <div className="input-group" style={{ maxWidth: 280 }}>
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted" style={{ fontSize: 14 }} />
            </span>
            <input
              className="form-control border-start-0 ps-0"
              placeholder="Tìm mã đơn, tên KH..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>

          <div className="d-flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                className={`btn btn-sm fw-semibold ${filterStatus === s ? "btn-dark" : "btn-outline-secondary"}`}
                style={{ fontSize: 13, borderRadius: 8 }}
                onClick={() => setFS(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="table-responsive">
          <table className="table adm-table mb-0">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Sản phẩm</th>
                <th>Tổng tiền</th>
                <th>Ngày đặt</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-5" style={{ fontSize: 14 }}>
                    <i className="bi bi-inbox" style={{ fontSize: 32, display: "block", marginBottom: 8, opacity: 0.3 }} />
                    Không có đơn hàng nào
                  </td>
                </tr>
              ) : filtered.map(o => {
                const s = STATUS_COLOR[o.status];
                return (
                  <tr key={o.id}>
                    <td className="fw-semibold" style={{ fontSize: 13 }}>{o.id}</td>
                    <td>
                      <div className="fw-semibold">{o.customer}</div>
                      <div className="adm-cust-email">{o.email}</div>
                    </td>
                    <td className="text-muted">{o.items} sản phẩm</td>
                    <td className="fw-bold">{fmtVND(o.total)}</td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{o.date}</td>
                    <td>
                      {editId === o.id ? (
                        <div className="d-flex gap-1 align-items-center">
                          <select className="form-select form-select-sm" style={{ fontSize: 13, width: 150, borderRadius: 8 }}
                            value={editStatus} onChange={e => setES(e.target.value)}>
                            {["Chờ xác nhận", "Đang giao", "Đã giao", "Đã huỷ"].map(opt => (
                              <option key={opt}>{opt}</option>
                            ))}
                          </select>
                          <button className="btn btn-dark btn-sm" style={{ borderRadius: 7, fontSize: 12 }}
                            onClick={() => saveStatus(o.id)}>✓</button>
                          <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: 7, fontSize: 12 }}
                            onClick={() => setEditId(null)}>✕</button>
                        </div>
                      ) : (
                        <span className={`badge bg-${s.bg} bg-opacity-10 text-${s.bg} fw-semibold`}
                          style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8 }}>
                          {s.label}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="adm-action-btn text-muted" title="Xem chi tiết">
                          <i className="bi bi-eye" />
                        </button>
                        <button className="adm-action-btn text-muted" title="Đổi trạng thái"
                          onClick={() => { setEditId(o.id); setES(o.status); }}>
                          <i className="bi bi-pencil" />
                        </button>
                        <button className="adm-action-btn text-danger" title="Xoá"
                          onClick={() => window.confirm("Xoá đơn hàng?") && setOrders(prev => prev.filter(x => x.id !== o.id))}>
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

        <div className="px-4 py-3 border-top" style={{ fontSize: 13, color: "#adb5bd" }}>
          Hiển thị {filtered.length} / {orders.length} đơn hàng
        </div>
      </div>
    </>
  );
}
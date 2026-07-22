// frontend\src\pages\Admin\Users\index.jsx
import { useState } from "react";

const INIT = [
  { id: 1, name: "Nguyễn Thị Mai",  email: "mai@gmail.com",   phone: "0901234567", role: "customer", orders: 12, joined: "01/03/2026", status: "Hoạt động" },
  { id: 2, name: "Trần Văn Bình",   email: "binh@gmail.com",  phone: "0912345678", role: "customer", orders: 7,  joined: "15/04/2026", status: "Hoạt động" },
  { id: 3, name: "Admin Selene",    email: "admin@selene.vn", phone: "0987654321", role: "admin",    orders: 0,  joined: "01/01/2026", status: "Hoạt động" },
  { id: 4, name: "Nhân Viên A",     email: "nva@selene.vn",   phone: "0978654321", role: "staff",    orders: 0,  joined: "10/02/2026", status: "Hoạt động" },
  { id: 5, name: "Lê Hoàng Anh",    email: "anh@gmail.com",   phone: "0934567890", role: "customer", orders: 3,  joined: "20/05/2026", status: "Bị khoá" },
  { id: 6, name: "Phạm Thị Lan",    email: "lan@gmail.com",   phone: "0923456789", role: "customer", orders: 21, joined: "08/06/2026", status: "Hoạt động" },
];

const ROLE_COLOR = {
  admin:    { bg: "danger",  label: "Admin" },
  staff:    { bg: "primary", label: "Nhân viên" },
  customer: { bg: "secondary", label: "Khách hàng" },
};

const STATUS_COLOR = {
  "Hoạt động": "success",
  "Bị khoá":  "danger",
};

export default function AdminUsers() {
  const [users, setUsers]   = useState(INIT);
  const [search, setSearch] = useState("");
  const [filterRole, setFR] = useState("all");

  const filtered = users.filter(u => {
    const matchS = u.name.toLowerCase().includes(search.toLowerCase()) ||
                   u.email.toLowerCase().includes(search.toLowerCase());
    const matchR = filterRole === "all" || u.role === filterRole;
    return matchS && matchR;
  });

  const toggleLock = (id) => {
    setUsers(prev => prev.map(u =>
      u.id === id
        ? { ...u, status: u.status === "Hoạt động" ? "Bị khoá" : "Hoạt động" }
        : u
    ));
  };

  const handleDelete = (id) => {
    if (!window.confirm("Xoá người dùng này?")) return;
    setUsers(prev => prev.filter(u => u.id !== id));
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
        .adm-user-email { font-size: 12px; color: #adb5bd; font-weight: 500; }
        .adm-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: #212529; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; flex-shrink: 0;
        }
      `}</style>

      <div className="adm-page-title">Quản lý người dùng</div>

      {/* stat mini */}
      <div className="row g-3 mb-4">
        {[
          { label: "Tổng người dùng", value: users.length,                                icon: "bi-people" },
          { label: "Khách hàng",      value: users.filter(u => u.role === "customer").length, icon: "bi-person" },
          { label: "Nhân viên",       value: users.filter(u => u.role === "staff").length,    icon: "bi-person-badge" },
          { label: "Bị khoá",        value: users.filter(u => u.status === "Bị khoá").length, icon: "bi-lock" },
        ].map(s => (
          <div className="col-6 col-xl-3" key={s.label}>
            <div className="d-flex align-items-center gap-3 bg-white rounded-3 p-3" style={{ border: "1px solid #f0f0f0" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "#212529", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, flexShrink: 0 }}>
                <i className={`bi ${s.icon}`} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#adb5bd", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#212529" }}>{s.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="adm-table-card">
        <div className="adm-table-head">
          <div className="input-group" style={{ maxWidth: 280 }}>
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted" style={{ fontSize: 14 }} />
            </span>
            <input
              className="form-control border-start-0 ps-0"
              placeholder="Tìm tên hoặc email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>

          <select className="form-select" style={{ maxWidth: 160, fontSize: 14 }}
            value={filterRole} onChange={e => setFR(e.target.value)}>
            <option value="all">Tất cả vai trò</option>
            <option value="customer">Khách hàng</option>
            <option value="staff">Nhân viên</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="table-responsive">
          <table className="table adm-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Người dùng</th>
                <th>Điện thoại</th>
                <th>Vai trò</th>
                <th>Đơn hàng</th>
                <th>Tham gia</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-5" style={{ fontSize: 14 }}>
                    <i className="bi bi-inbox" style={{ fontSize: 32, display: "block", marginBottom: 8, opacity: 0.3 }} />
                    Không tìm thấy người dùng
                  </td>
                </tr>
              ) : filtered.map((u, idx) => {
                const role   = ROLE_COLOR[u.role];
                const stBg   = STATUS_COLOR[u.status];
                const initials = u.name.split(" ").slice(-2).map(w => w[0]).join("").toUpperCase();
                return (
                  <tr key={u.id}>
                    <td className="text-muted" style={{ fontSize: 13 }}>{idx + 1}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="adm-avatar">{initials}</div>
                        <div>
                          <div className="fw-semibold">{u.name}</div>
                          <div className="adm-user-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted">{u.phone}</td>
                    <td>
                      <span className={`badge bg-${role.bg} bg-opacity-10 text-${role.bg} fw-semibold`}
                        style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8 }}>
                        {role.label}
                      </span>
                    </td>
                    <td>{u.orders}</td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{u.joined}</td>
                    <td>
                      <span className={`badge bg-${stBg} bg-opacity-10 text-${stBg} fw-semibold`}
                        style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8 }}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="adm-action-btn text-muted" title="Xem">
                          <i className="bi bi-eye" />
                        </button>
                        <button
                          className={`adm-action-btn ${u.status === "Hoạt động" ? "text-warning" : "text-success"}`}
                          title={u.status === "Hoạt động" ? "Khoá tài khoản" : "Mở khoá"}
                          onClick={() => toggleLock(u.id)}
                        >
                          <i className={`bi ${u.status === "Hoạt động" ? "bi-lock" : "bi-unlock"}`} />
                        </button>
                        <button className="adm-action-btn text-danger" title="Xoá"
                          onClick={() => handleDelete(u.id)}>
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
          Hiển thị {filtered.length} / {users.length} người dùng
        </div>
      </div>
    </>
  );
}
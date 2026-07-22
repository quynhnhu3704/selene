// frontend\src\pages\Admin\Categories\index.jsx
import { useState } from "react";

const INIT = [
  { id: 1, name: "Áo Nữ",     slug: "ao-nu",      products: 86, order: 1, active: true },
  { id: 2, name: "Áo Khoác",  slug: "ao-khoac",   products: 24, order: 2, active: true },
  { id: 3, name: "Quần Nữ",   slug: "quan-nu",     products: 51, order: 3, active: true },
  { id: 4, name: "Váy",        slug: "vay",         products: 38, order: 4, active: true },
  { id: 5, name: "Đầm",        slug: "dam",         products: 42, order: 5, active: true },
  { id: 6, name: "Set Đồ Nữ", slug: "set-do-nu",  products: 19, order: 6, active: false },
  { id: 7, name: "Phụ Kiện",  slug: "phu-kien",   products: 15, order: 7, active: true },
  { id: 8, name: "Jumpsuit",   slug: "jumpsuit",    products: 9,  order: 8, active: true },
];

export default function AdminCategories() {
  const [cats, setCats]     = useState(INIT);
  const [search, setSearch] = useState("");
  const [showModal, setShow] = useState(false);
  const [editing, setEditing] = useState(null);   // null = thêm mới
  const [form, setForm]     = useState({ name: "", slug: "", order: "", active: true });

  const filtered = cats.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", slug: "", order: cats.length + 1, active: true });
    setShow(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug, order: cat.order, active: cat.active });
    setShow(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      setCats(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } : c));
    } else {
      setCats(prev => [...prev, { id: Date.now(), ...form, products: 0 }]);
    }
    setShow(false);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Xoá danh mục này?")) return;
    setCats(prev => prev.filter(c => c.id !== id));
  };

  const toggleActive = (id) =>
    setCats(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));

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
        .adm-slug { font-size: 12px; color: #adb5bd; font-family: monospace; }

        /* MODAL */
        .adm-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1050; display: flex; align-items: center; justify-content: center; }
        .adm-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 440px; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.18); }
        .adm-modal-title { font-size: 16px; font-weight: 800; color: #212529; margin-bottom: 22px; text-transform: uppercase; letter-spacing: 0.5px; }
      `}</style>

      <div className="adm-page-title">Quản lý danh mục</div>

      <div className="adm-table-card">
        <div className="adm-table-head">
          <div className="input-group" style={{ maxWidth: 280 }}>
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted" style={{ fontSize: 14 }} />
            </span>
            <input
              className="form-control border-start-0 ps-0"
              placeholder="Tìm danh mục..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 14 }}
            />
          </div>
          <div className="ms-auto">
            <button className="btn btn-dark form-btn fw-semibold" onClick={openAdd}>
              <i className="bi bi-plus-lg me-1" />Thêm danh mục
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table adm-table mb-0">
            <thead>
              <tr>
                <th>STT</th>
                <th>Danh mục</th>
                <th>Số SP</th>
                <th>Thứ tự</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <tr key={c.id}>
                  <td className="text-muted" style={{ fontSize: 13 }}>{idx + 1}</td>
                  <td>
                    <div className="fw-semibold">{c.name}</div>
                    <div className="adm-slug">/{c.slug}</div>
                  </td>
                  <td>{c.products} sản phẩm</td>
                  <td>{c.order}</td>
                  <td>
                    <div className="form-check form-switch mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={c.active}
                        onChange={() => toggleActive(c.id)}
                        style={{ cursor: "pointer", width: 36, height: 20 }}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="adm-action-btn text-muted" onClick={() => openEdit(c)} title="Sửa">
                        <i className="bi bi-pencil" />
                      </button>
                      <button className="adm-action-btn text-danger" onClick={() => handleDelete(c.id)} title="Xoá">
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-top" style={{ fontSize: 13, color: "#adb5bd" }}>
          {cats.length} danh mục
        </div>
      </div>

      {/* ── MODAL THÊM / SỬA ── */}
      {showModal && (
        <div className="adm-modal-backdrop" onClick={() => setShow(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">
              {editing ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
            </div>

            <div>
              <div className="form-label-row">
                <label className="form-label mb-0">Tên danh mục</label>
              </div>
              <div className="form-input-wrap">
                <input
                  className="form-control"
                  placeholder="Nhập tên danh mục"
                  value={form.name}
                  onChange={e => setForm(p => ({
                    ...p, name: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
                  }))}
                  maxLength={80}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="form-label-row">
                <label className="form-label mb-0">Slug (URL)</label>
              </div>
              <div className="form-input-wrap">
                <input
                  className="form-control"
                  placeholder="slug-danh-muc"
                  value={form.slug}
                  onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
                  style={{ fontFamily: "monospace", fontSize: 14 }}
                />
              </div>
            </div>

            <div>
              <div className="form-label-row">
                <label className="form-label mb-0">Thứ tự hiển thị</label>
              </div>
              <div className="form-input-wrap">
                <input
                  type="number" className="form-control" min={1}
                  value={form.order}
                  onChange={e => setForm(p => ({ ...p, order: +e.target.value }))}
                />
              </div>
            </div>

            <div className="form-check form-switch mb-4">
              <input
                className="form-check-input" type="checkbox"
                id="cat-active" checked={form.active}
                onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                style={{ width: 36, height: 20, cursor: "pointer" }}
              />
              <label className="form-check-label ms-2" htmlFor="cat-active" style={{ fontSize: 15, fontWeight: 500 }}>
                Hiển thị danh mục
              </label>
            </div>

            <div className="row">
              <div className="col-6">
                <button className="form-btn btn btn-outline-dark fw-semibold w-100"
                  onClick={() => setShow(false)}>Huỷ</button>
              </div>
              <div className="col-6">
                <button className="form-btn btn btn-dark fw-semibold w-100"
                  onClick={handleSave}>
                  {editing ? "Lưu thay đổi" : "Thêm danh mục"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
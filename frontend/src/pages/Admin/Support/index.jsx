import { useState } from "react";
import AdminSelect from "../components/AdminSelect";
import ChatPanel from "../../../components/SupportChat/ChatPanel";
import { STATUS_LABELS } from "../../../components/SupportChat/constants";
import CustomerInfo from "./components/CustomerInfo";
import "../../../components/SupportChat/support.css";

const MOCK_USER = {
  accountId: 1,
  full_name: "Admin",
  role: "admin",
  permissions: ["chat:view", "chat:assign", "chat:close", "chat:reply"],
};

const INITIAL_CONVERSATIONS = [
  {
    conversation_id: 1,
    customer_id: 101,
    customer_name: "Nguyễn Văn A",
    customer_unread: 0,
    staff_unread: 1,
    status: "waiting",
    assigned_staff_id: null,
    last_message: "Shop cho mình hỏi sản phẩm này còn hàng không?",
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    customer: { full_name: "Nguyễn Văn A", email: "nguyenvana@example.com", phone: "0901234567" },
  },
  {
    conversation_id: 2,
    customer_id: 102,
    customer_name: "Trần Thị B",
    customer_unread: 0,
    staff_unread: 0,
    status: "open",
    assigned_staff_id: 1,
    last_message: "Cảm ơn tư vấn của shop!",
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    customer: { full_name: "Trần Thị B", email: "tranthib@example.com", phone: "0987654321" },
  }
];

function SupportInbox() {
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState(1);

  const filtered = conversations.filter((item) => !status || item.status === status);
  const selected = conversations.find((item) => item.conversation_id === selectedId) || conversations[0];
  const waiting = conversations.filter((item) => item.status === "waiting").length;

  const handleAssign = () => {
    if (!selectedId) return;
    setConversations((prev) => prev.map((item) => item.conversation_id === selectedId ? { ...item, status: "open", assigned_staff_id: MOCK_USER.accountId } : item));
  };

  const handleClose = () => {
    if (!selectedId) return;
    setConversations((prev) => prev.map((item) => item.conversation_id === selectedId ? { ...item, status: "closed" } : item));
  };

  const assignedToMe = selected?.assigned_staff_id === MOCK_USER.accountId;

  return <>
    <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
      <div><h1 className="support-title">Hỗ trợ khách hàng</h1>
        <span className="text-muted">{waiting} hội thoại chờ xử lý</span></div>
      <span className="support-connection">● Đã kết nối</span>
    </div>

    <div className="support-workspace">
      <aside className="support-conversations">
        <div className="p-3 border-bottom"><label className="fw-semibold mb-2" htmlFor="support-filter">Hội thoại</label>
          <AdminSelect id="support-filter" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Tất cả hội thoại</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </AdminSelect></div>
        <div className="support-conversation-scroll">
          {!filtered.length && <p className="text-muted text-center p-3">Chưa có hội thoại.</p>}
          {filtered.map((item) => <button key={item.conversation_id}
            className={`support-conversation${selectedId === item.conversation_id ? " selected" : ""}`}
            onClick={() => setSelectedId(item.conversation_id)}>
            <div className="d-flex justify-content-between gap-2"><strong>{item.customer_name || "Khách hàng"}</strong>
              {Number(item.staff_unread) > 0 && <span className="support-unread">{item.staff_unread}</span>}</div>
            <div className="support-preview">{item.last_message || "Yêu cầu hỗ trợ mới"}</div>
            <div className="d-flex justify-content-between align-items-center mt-2"><span className={`support-status ${item.status}`}>{STATUS_LABELS[item.status]}</span>
              <small className="text-muted">{new Date(item.last_message_at || item.created_at).toLocaleDateString("vi-VN")}</small></div>
          </button>)}
        </div>
      </aside>
      <section className="support-main">
        {selected ? <>
          <div className="support-chat-header"><div><strong>{selected.customer?.full_name || "Khách hàng"}</strong>
            <div className="mt-1"><span className={`support-status ${selected.status}`}>{STATUS_LABELS[selected.status]}</span></div></div>
            <div className="d-flex gap-2">
              {selected.status === "waiting" && <button className="btn btn-dark btn-sm" onClick={handleAssign}>Nhận xử lý</button>}
              {selected.status !== "closed" && <button className="btn btn-outline-secondary btn-sm" onClick={handleClose}>Đóng hội thoại</button>}
            </div>
          </div>
          {selected.status !== "closed" && !assignedToMe && <div className="support-notice">{selected.assigned_staff_id ? "Hội thoại đang được nhân viên khác xử lý." : "Nhận xử lý hội thoại để trả lời khách hàng."}</div>}
          <ChatPanel key={selected.conversation_id} conversation={selected} user={MOCK_USER} canReply={assignedToMe || selected.status === "waiting"} />
        </> : <div className="support-empty"><i className="bi bi-chat-square-text" /><h5>Chọn một hội thoại để bắt đầu</h5></div>}
      </section>
      {selected && <CustomerInfo customer={selected.customer} canViewOrder={true} />}
    </div>
  </>;
}

export default function AdminSupport() {
  return <SupportInbox />;
}

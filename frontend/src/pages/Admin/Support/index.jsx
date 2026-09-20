import Loading from "../../../components/common/Loading";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { assignConversation, closeConversation, getConversation, getConversations } from "../../../services/chat.service";
import { isLoggedIn } from "../../../utils/auth";
import ChatPanel from "../../../components/SupportChat/ChatPanel";
import useChatSession from "../../../components/SupportChat/useChatSession";
import { canChat, STATUS_LABELS } from "../../../components/SupportChat/constants";
import CustomerInfo from "./components/CustomerInfo";
import "../../../components/SupportChat/support.css";

function SupportInbox() {
  const { session, connected, error: sessionError, retry } = useChatSession();
  const [conversations, setConversations] = useState([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [waiting, setWaiting] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!session || !canChat(session.user, "chat:view")) return;
    let active = true;
    let sequence = 0;
    const refresh = async () => {
      const request = ++sequence;
      try {
        const res = await getConversations({ status, page, limit: 30 });
        if (!active || request !== sequence) return;
        setConversations(res.data.data);
        setTotal(res.data.pagination.totalItems);
        setWaiting(res.data.waitingCount);
      } catch (err) { if (active) setError(err.response?.data?.message || "Không thể tải hộp thư."); }
    };
    refresh();
    session.socket.on("conversation:update", refresh);
    session.socket.on("connect", refresh);
    const timer = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(timer); session.socket.off("conversation:update", refresh); session.socket.off("connect", refresh); };
  }, [session, status, page, version]);
  useEffect(() => {
    if (!session || !selectedId) return;
    let active = true;
    let sequence = 0;
    const refresh = async () => {
      const request = ++sequence;
      try {
        const res = await getConversation(selectedId);
        if (active && request === sequence) setDetail(res.data.data);
      } catch (err) { if (active) { setDetail(null); setError(err.response?.data?.message || "Không thể tải hội thoại."); } }
    };
    const onUpdate = (data) => { if (data.conversation_id === selectedId) refresh(); };
    refresh();
    session.socket.on("conversation:update", onUpdate);
    session.socket.on("connect", refresh);
    const timer = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(timer); session.socket.off("conversation:update", onUpdate); session.socket.off("connect", refresh); };
  }, [session, selectedId, version]);
  const act = async (action) => {
    setBusy(true);
    setError("");
    try {
      const res = await action(selectedId);
      setDetail((current) => current?.conversation_id === selectedId ? { ...current, ...res.data.data } : current);
      setVersion((value) => value + 1);
    } catch (err) { setError(err.response?.data?.message || "Không thể cập nhật hội thoại."); }
    finally { setBusy(false); }
  };
  if (sessionError) return <div className="alert alert-warning">{sessionError} <button className="btn btn-link" onClick={retry}>Thử lại</button></div>;
  if (!session) return <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "60vh" }}><Loading text="Đang tải hộp thư..." /></div>;
  if (!canChat(session.user, "chat:view")) return <div className="alert alert-warning">Bạn không có quyền xem hộp thư CSKH.</div>;
  const selected = detail?.conversation_id === selectedId ? detail : null;
  const assignedToMe = selected?.assigned_staff_id === session.user.accountId;
  return <>
    <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
      <div><h1 className="support-title">Hỗ trợ khách hàng</h1>
        <span className="text-muted">{waiting} hội thoại chờ xử lý</span></div>
      <span className="support-connection">{connected ? "● Đã kết nối" : "Đang kết nối lại..."}</span>
    </div>
    {error && <div className="alert alert-warning" role="alert">{error} <button className="btn btn-link btn-sm" onClick={() => { setError(""); setVersion((value) => value + 1); }}>Thử lại</button></div>}
    <div className="support-workspace">
      <aside className="support-conversations">
        <div className="p-3 border-bottom"><label className="fw-semibold mb-2" htmlFor="support-filter">Hội thoại</label>
          <select className="form-select form-select-sm" id="support-filter" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">Tất cả hội thoại</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></div>
        <div className="support-conversation-scroll">
          {!conversations.length && <p className="text-muted text-center p-3">Chưa có hội thoại.</p>}
          {conversations.map((item) => <button key={item.conversation_id} disabled={busy}
            className={`support-conversation${selectedId === item.conversation_id ? " selected" : ""}`}
            onClick={() => { setSelectedId(item.conversation_id); setError(""); }}>
            <div className="d-flex justify-content-between gap-2"><strong>{item.customer_name || "Khách hàng"}</strong>
              {Number(item.staff_unread) > 0 && <span className="support-unread">{item.staff_unread}</span>}</div>
            <div className="support-preview">{item.last_message || "Yêu cầu hỗ trợ mới"}</div>
            <div className="d-flex justify-content-between align-items-center mt-2"><span className={`support-status ${item.status}`}>{STATUS_LABELS[item.status]}</span>
              <small className="text-muted">{new Date(item.last_message_at || item.created_at).toLocaleDateString("vi-VN")}</small></div>
          </button>)}
        </div>
        <div className="d-flex justify-content-between align-items-center p-2 border-top">
          <button className="btn btn-sm btn-light" disabled={page === 1} onClick={() => setPage((value) => value - 1)} aria-label="Trang trước">‹</button>
          <small>{page} / {Math.max(1, Math.ceil(total / 30))}</small>
          <button className="btn btn-sm btn-light" disabled={page * 30 >= total} onClick={() => setPage((value) => value + 1)} aria-label="Trang sau">›</button>
        </div>
      </aside>
      <section className="support-main">
        {selected ? <>
          <div className="support-chat-header"><div><strong>{selected.customer?.full_name || "Khách hàng"}</strong>
            <div className="mt-1"><span className={`support-status ${selected.status}`}>{STATUS_LABELS[selected.status]}</span></div></div>
            <div className="d-flex gap-2">
              {selected.status === "waiting" && canChat(session.user, "chat:assign") && <button className="btn btn-dark btn-sm" disabled={busy} onClick={() => act(assignConversation)}>Nhận xử lý</button>}
              {selected.status !== "closed" && canChat(session.user, "chat:close") && (assignedToMe || session.user.role === "admin") &&
                <button className="btn btn-outline-secondary btn-sm" disabled={busy} onClick={() => act(closeConversation)}>Đóng hội thoại</button>}
            </div>
          </div>
          {selected.status !== "closed" && !assignedToMe && <div className="support-notice">{selected.assigned_staff_id ? "Hội thoại đang được nhân viên khác xử lý." : "Nhận xử lý hội thoại để trả lời khách hàng."}</div>}
          <ChatPanel key={selectedId} conversation={selected} user={session.user} socket={session.socket} canReply={assignedToMe && canChat(session.user, "chat:reply")} />
        </> : <div className="support-empty">{selectedId ? <Loading text="Đang tải hội thoại..." /> : <><i className="bi bi-chat-square-text" /><h5>Chọn một hội thoại để bắt đầu</h5></>}</div>}
      </section>
      {selected && <CustomerInfo customer={selected.customer} canViewOrder={session.user.role === "admin" || session.user.permissions.includes("order:view")} />}
    </div>
  </>;
}

export default function AdminSupport() {
  return isLoggedIn() ? <SupportInbox /> : <div className="alert alert-warning">Vui lòng <Link to="/tai-khoan/dang-nhap">đăng nhập</Link> để mở hộp thư CSKH.</div>;
}

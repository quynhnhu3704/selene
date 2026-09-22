import Loading from "../../components/common/Loading";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createConversation, getMyConversations } from "../../services/chat.service";
import { isLoggedIn } from "../../utils/auth";
import ChatPanel from "../../components/SupportChat/ChatPanel";
import useChatSession from "../../components/SupportChat/useChatSession";
import { STATUS_LABELS } from "../../components/SupportChat/constants";
import "../../components/SupportChat/support.css";

function CustomerSupport() {
  const { session, connected, error: sessionError, retry } = useChatSession();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (!session || session.user.role !== "customer") return;
    let active = true;
    let sequence = 0;
    const refresh = async () => {
      const request = ++sequence;
      try {
        const res = await getMyConversations();
        if (!active || request !== sequence) return;
        setConversations(res.data.data);
        setSelectedId((current) => current || res.data.data[0]?.conversation_id || null);
        setError("");
      } catch (err) { if (active) setError(err.response?.data?.message || "Không thể tải hội thoại."); }
      finally { if (active) setLoading(false); }
    };
    refresh();
    session.socket.on("conversation:update", refresh);
    session.socket.on("connect", refresh);
    const timer = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(timer); session.socket.off("conversation:update", refresh); session.socket.off("connect", refresh); };
  }, [session]);
  const start = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await createConversation();
      setConversations((current) => [res.data.data, ...current.filter((item) => item.conversation_id !== res.data.data.conversation_id)]);
      setSelectedId(res.data.data.conversation_id);
    } catch (err) { setError(err.response?.data?.message || "Không thể tạo hội thoại."); }
    finally { setCreating(false); }
  };
  if (sessionError) return <div className="alert alert-warning">{sessionError} <button className="btn btn-link" onClick={retry}>Thử lại</button></div>;
  if (!session) return <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "60vh" }}><Loading text="Đang kết nối..." /></div>;
  if (session.user.role !== "customer") return <Link className="btn btn-dark" to="/admin/ho-tro">Mở hộp thư CSKH</Link>;
  const selected = conversations.find((item) => item.conversation_id === selectedId);
  const open = conversations.find((item) => item.status !== "closed");
  return <>
    {error && <div className="alert alert-warning" role="alert">{error}</div>}
    <div className="support-workspace">
      <aside className="support-conversations">
        <div className="p-3 border-bottom"><strong>Hội thoại của bạn</strong>
          <button className="btn btn-dark btn-sm w-100 mt-3" disabled={creating || loading}
            onClick={() => open ? setSelectedId(open.conversation_id) : start()}>
            {creating ? "Đang tạo..." : open ? "Tiếp tục hội thoại" : "Yêu cầu hỗ trợ mới"}
          </button>
        </div>
        <div className="support-conversation-scroll">
          {conversations.map((item) => <button key={item.conversation_id}
            className={`support-conversation${item.conversation_id === selectedId ? " selected" : ""}`}
            onClick={() => setSelectedId(item.conversation_id)}>
            <div className="d-flex justify-content-between align-items-center"><strong>Selene Support</strong>
              {Number(item.customer_unread) > 0 && <span className="support-unread">{item.customer_unread}</span>}
            </div>
            <div className="support-preview">{item.last_message || "Bạn cần Selene giúp gì?"}</div>
            <div className="d-flex justify-content-between align-items-center mt-2"><span className={`support-status ${item.status}`}>{STATUS_LABELS[item.status]}</span>
              <small className="text-muted">{new Date(item.created_at).toLocaleDateString("vi-VN")}</small></div>
          </button>)}
        </div>
      </aside>
      <section className="support-main">
        <div className="support-chat-header"><div><strong>Chat với nhân viên Selene</strong>
          <div className="support-connection">{connected ? "Đã kết nối" : "Đang kết nối lại..."}</div></div>
          {selected && <span className={`support-status ${selected.status}`}>{STATUS_LABELS[selected.status]}</span>}
        </div>
        {loading ? <div className="support-empty"><Loading text="Đang tải hội thoại..." /></div> : selected ? <ChatPanel key={selected.conversation_id} conversation={selected} user={session.user} socket={session.socket} canReply /> :
          <div className="support-empty"><i className="bi bi-headset" /><h5>Chúng tôi có thể giúp gì cho bạn?</h5>
            <p>Hỏi về đơn hàng, sản phẩm hoặc chính sách đổi trả.</p>
            <button className="btn btn-dark" disabled={creating || loading} onClick={start}>Bắt đầu trò chuyện</button></div>}
      </section>
    </div>
  </>;
}

export default function Support() {
  return <div className="support-page">
    <h1 className="support-title">Chăm sóc khách hàng</h1>
    <p className="support-subtitle">Kết nối trực tiếp với nhân viên Selene để được hỗ trợ.</p>
    {isLoggedIn() ? <CustomerSupport /> : <div className="support-empty"><i className="bi bi-headset" />
      <p>Đăng nhập để trò chuyện và lưu lại lịch sử hỗ trợ của bạn.</p>
      <Link className="btn btn-dark" to="/tai-khoan/dang-nhap">Đăng nhập</Link></div>}
  </div>;
}

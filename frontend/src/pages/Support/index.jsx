import { useState } from "react";
import ChatPanel from "../../components/SupportChat/ChatPanel";
import { STATUS_LABELS } from "../../components/SupportChat/constants";
import "../../components/SupportChat/support.css";

const MOCK_CUSTOMER = {
  accountId: 101,
  full_name: "Khách hàng",
  role: "customer",
};

const INITIAL_CONVERSATIONS = [
  {
    conversation_id: 1,
    customer_id: 101,
    customer_name: "Khách hàng",
    customer_unread: 0,
    staff_unread: 0,
    status: "open",
    last_message: "Xin chào, tôi cần hỗ trợ tư vấn sản phẩm.",
    created_at: new Date().toISOString(),
  }
];

function CustomerSupport() {
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState(null);

  const start = () => {
    const newConv = {
      conversation_id: Date.now(),
      customer_id: 101,
      customer_name: "Khách hàng",
      customer_unread: 0,
      staff_unread: 0,
      status: "open",
      last_message: "Yêu cầu hỗ trợ mới",
      created_at: new Date().toISOString(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setSelectedId(newConv.conversation_id);
  };

  const handleReopen = (id) => {
    setConversations((prev) =>
      prev.map((item) =>
        item.conversation_id === id ? { ...item, status: "open" } : item
      )
    );
  };

  const selected = selectedId
    ? conversations.find((item) => item.conversation_id === selectedId) || null
    : null;
  const open = conversations.find((item) => item.status !== "closed");

  return <>
    <div className="support-workspace">
      <aside className="support-conversations">
        <div className="p-3 border-bottom"><strong>Hội thoại của bạn</strong>
          <button className="btn btn-dark btn-sm w-100 mt-3"
            onClick={() => open ? setSelectedId(open.conversation_id) : start()}>
            {open ? "Tiếp tục hội thoại" : "Yêu cầu hỗ trợ mới"}
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
        <div className="support-chat-header">
          <div>
            <strong>Chat với nhân viên Selene</strong>
            <div className="support-connection">Đã kết nối</div>
          </div>
          {selected && (
            <div className="d-flex align-items-center gap-2">
              <span className={`support-status ${selected.status}`}>{STATUS_LABELS[selected.status]}</span>
              {selected.status === "closed" && (
                <button
                  type="button"
                  className="btn btn-dark btn-sm d-inline-flex align-items-center gap-1"
                  onClick={() => handleReopen(selected.conversation_id)}
                >
                  <i className="bi bi-arrow-counterclockwise" />
                  <span>Mở lại hội thoại</span>
                </button>
              )}
            </div>
          )}
        </div>
        {selected ? (
          <ChatPanel
            key={selected.conversation_id}
            conversation={selected}
            user={MOCK_CUSTOMER}
            isClosed={selected.status === "closed"}
            onReopen={() => handleReopen(selected.conversation_id)}
            canReply
          />
        ) : (
          <div className="support-empty"><i className="bi bi-headset" /><h5>Chúng tôi có thể giúp gì cho bạn?</h5>
            <p>Hỏi về đơn hàng, sản phẩm hoặc chính sách đổi trả.</p>
            <button className="btn btn-dark" onClick={start}>Bắt đầu trò chuyện</button></div>)}
      </section>
    </div>
  </>;
}

export default function Support() {
  return <div className="support-page">
    <h1 className="support-title">Chăm sóc khách hàng</h1>
    <p className="support-subtitle">Kết nối trực tiếp với nhân viên Selene để được hỗ trợ.</p>
    <CustomerSupport />
  </div>;
}

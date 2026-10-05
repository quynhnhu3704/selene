import Loading from "../common/Loading";
import { useEffect, useRef } from "react";

export default function MessageList({
  messages,
  accountId,
  isCustomer = false,
  hasMore,
  loadingMore,
  onLoadMore,
}) {
  const bottomRef = useRef(null);
  const lastId = messages.at(-1)?.message_id;
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "nearest" }); }, [lastId]);

  return (
    <div className="support-messages" role="log" aria-label="Tin nhắn hỗ trợ" aria-live="polite">
      {loadingMore ? (
        <Loading text="Đang tải tin nhắn..." />
      ) : (
        hasMore && (
          <button
            type="button"
            className="btn btn-sm btn-light d-block mx-auto mb-3"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            <i className="bi bi-clock-history me-1" />
            Xem tin nhắn cũ hơn
          </button>
        )
      )}
      {!messages.length && (
        <div className="support-empty">
          <i className="bi bi-chat-dots" />
          <h5>Chưa có tin nhắn</h5>
          <p>Cuộc hội thoại này hiện chưa có tin nhắn trao đổi.</p>
        </div>
      )}
      {messages.map((message) => {
        const isSenderCustomer = message.sender_role === "customer";
        const own = isCustomer
          ? isSenderCustomer || String(message.sender_id) === String(accountId)
          : !isSenderCustomer && (
              String(message.sender_id) === String(accountId) ||
              message.sender_role === "staff" ||
              message.sender_role === "admin"
            );
        return (
          <div key={message.message_id} className={`support-message-row${own ? " own" : ""}`}>
            <div className="support-bubble">
              <div>{message.content}</div>
              <small>
                {new Date(message.created_at).toLocaleString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {own && <span className="ms-2">{message.is_read ? "Đã xem" : "Đã gửi"}</span>}
              </small>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

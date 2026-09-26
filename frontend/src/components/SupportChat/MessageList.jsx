import Loading from "../common/Loading";
import { useEffect, useRef } from "react";

export default function MessageList({
  messages,
  accountId,
  hasMore,
  loadingMore,
  onLoadMore,
}) {
  const bottomRef = useRef(null);
  const lastId = messages.at(-1)?.message_id;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [lastId]);

  return (
    <div
      className="support-messages"
      role="log"
      aria-label="Tin nhắn hỗ trợ"
      aria-live="polite"
    >
      {loadingMore ? (
        <Loading text="Đang tải tin nhắn..." />
      ) : (
        hasMore && (
          <button
            className="btn btn-sm btn-light d-block mx-auto mb-3"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            Xem tin nhắn cũ hơn
          </button>
        )
      )}
      {!messages.length && (
        <div className="support-empty">
          <i className="bi bi-chat-heart" />
          <h5>Selene luôn sẵn lòng hỗ trợ bạn</h5>
          <p>Hãy gửi câu hỏi để bắt đầu cuộc trò chuyện với nhân viên.</p>
        </div>
      )}
      {messages.map((message) => {
        const own = message.sender_id === accountId;
        return (
          <div
            key={message.message_id}
            className={`support-message-row${own ? " own" : ""}`}
          >
            <div className="support-bubble">
              <div>{message.content}</div>
              <small>
                {new Date(message.created_at).toLocaleString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {own && (
                  <span className="ms-2">
                    {message.is_read ? "Đã xem" : "Đã gửi"}
                  </span>
                )}
              </small>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

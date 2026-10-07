import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

export default function ChatPanel({
  conversation,
  user,
  messages = [],
  loading = false,
  error = null,
  pagination = null,
  loadingMore = false,
  onLoadMore,
  onSend,
  onAssign,
  onReopen,
  canShowMessages = false,
  canSendMessage = false,
  isPending = false,
  isProcessing = false,
  isClosed = false,
  isAssignedToMe = false,
}) {
  const currentAccountId = user?.accountId || user?.account_id || user?.id || 1;
  const isCustomer = user?.role === "customer";

  const showMessages = isCustomer ? true : canShowMessages;
  const showSendInput = isCustomer ? true : canSendMessage;
  const checkPending = isCustomer ? false : isPending;
  const checkProcessing = isCustomer ? false : isProcessing;
  const checkAssignedToMe = isCustomer ? true : isAssignedToMe;

  // 1. Trạng thái đang tải tin nhắn
  if (loading) {
    return (
      <div className="support-chat-panel">
        <div className="support-empty py-5">
          <div className="spinner-border text-secondary mb-3" role="status" />
          <h5>Đang tải tin nhắn...</h5>
        </div>
      </div>
    );
  }

  // 2. Trạng thái lỗi khi tải tin nhắn
  if (error) {
    return (
      <div className="support-chat-panel">
        <div className="support-empty py-5">
          <i className="bi bi-exclamation-triangle text-danger" />
          <h5>Không thể tải tin nhắn</h5>
          <p className="text-danger">{error}</p>
        </div>
      </div>
    );
  }

  // 3. Trạng thái Processing nhưng không phải nhân viên đang đăng nhập: Không hiển thị tin nhắn và thanh gửi
  if (checkProcessing && !checkAssignedToMe) {
    return (
      <div className="support-chat-panel">
        <div className="support-state-notice">
          <div className="support-state-icon locked">
            <i className="bi bi-shield-lock" />
          </div>
          <h5>Đang được xử lý bởi nhân viên khác</h5>
          <p>
            Bạn không phải là nhân viên tiếp nhận cuộc trò chuyện này nên không thể xem nội dung tin nhắn và thông tin khách hàng.
          </p>
        </div>
      </div>
    );
  }

  // 4. Hiển thị tin nhắn:
  // - Nếu processing & là nhân viên đang đăng nhập: Hiển thị tin nhắn + thanh gửi tin nhắn
  // - Nếu pending: Hiển thị tin nhắn thôi, thanh gửi bị ẩn, có thanh thông báo & nút nhận xử lý ở dưới
  // - Nếu closed: Hiển thị tin nhắn thôi, thanh gửi bị ẩn, có thông báo cuộc trò chuyện đã kết thúc
  if (showMessages) {
    return (
      <div className="support-chat-panel">
        <MessageList
          messages={messages}
          accountId={currentAccountId}
          isCustomer={isCustomer}
          hasMore={pagination?.has_more}
          loadingMore={loadingMore}
          onLoadMore={onLoadMore}
        />

        {isClosed && (
          <div className="support-notice d-flex align-items-center justify-content-between py-2 px-3 flex-wrap gap-2">
            <span>
              <i className="bi bi-info-circle text-secondary me-2" />
              Cuộc trò chuyện đã kết thúc. Bạn có thể mở lại để tiếp tục hỗ trợ.
            </span>
            {onReopen && (
              <button
                type="button"
                className="btn btn-outline-dark btn-sm d-inline-flex align-items-center gap-1"
                onClick={onReopen}
              >
                <i className="bi bi-arrow-counterclockwise" />
                <span>Mở lại hội thoại</span>
              </button>
            )}
          </div>
        )}

        {checkPending && (
          <div className="support-notice d-flex align-items-center justify-content-between py-2 px-3 flex-wrap gap-2">
            <span>
              <i className="bi bi-clock-history text-warning me-2" />
              Cuộc trò chuyện đang chờ hỗ trợ. Vui lòng nhận xử lý để trả lời khách hàng.
            </span>
            {onAssign && (
              <button
                type="button"
                className="btn btn-dark btn-sm"
                onClick={onAssign}
              >
                Nhận xử lý
              </button>
            )}
          </div>
        )}

        {showSendInput && (!isClosed || isCustomer) && !checkPending && (
          <MessageInput disabled={false} onSend={onSend} />
        )}
      </div>
    );
  }

  // Fallback mặc định
  return (
    <div className="support-chat-panel">
      <div className="support-empty py-5">
        <i className="bi bi-chat-square-text" />
        <h5>Chưa thể hiển thị tin nhắn</h5>
        <p>Vui lòng kiểm tra lại quyền truy cập hoặc trạng thái cuộc hội thoại.</p>
      </div>
    </div>
  );
}


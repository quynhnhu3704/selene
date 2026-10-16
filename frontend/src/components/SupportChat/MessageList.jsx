import EmptyState from "../common/EmptyState";
import Loading from "../common/Loading";
import { useEffect, useRef } from "react";

// Định dạng kích thước tệp tin (KB, MB)
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "";
  const num = Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

// Trích xuất và chuẩn hóa thông tin media từ tin nhắn
function resolveMedia(message) {
  let fileUrl = message.file_url || null;
  let fileName = message.file_name || null;
  let fileSize = message.file_size || null;
  let fileType = message.file_type || null;
  let messageType = message.message_type || "text";
  let caption = message.content || "";

  // Nếu tin nhắn có danh sách attachments từ bảng message_attachments
  if (!fileUrl && Array.isArray(message.attachments) && message.attachments.length > 0) {
    const firstAtt = message.attachments[0];
    fileUrl = firstAtt.file_url;
    fileName = firstAtt.file_name;
    fileSize = firstAtt.file_size;
    fileType = firstAtt.file_type;
  }

  // Dự phòng: Nếu content là JSON fallback
  if (typeof caption === "string" && caption.startsWith("{")) {
    try {
      const parsed = JSON.parse(caption);
      if (parsed.file_url || parsed.url) {
        fileUrl = parsed.file_url || parsed.url;
        fileName = parsed.file_name || parsed.name || fileName;
        fileSize = parsed.file_size || parsed.size || fileSize;
        fileType = parsed.file_type || parsed.type || fileType;
        if (parsed.type) messageType = parsed.type;
        caption = parsed.text || parsed.caption || "";
      }
    } catch {
      // Giữ nguyên caption
    }
  }

  // Nếu content là URL trực tiếp
  if (!fileUrl && typeof caption === "string" && caption.startsWith("http")) {
    fileUrl = caption;
  }

  // Tự động phân loại nếu có link file
  if (fileUrl) {
    const ext = (fileName || fileUrl).split(".").pop()?.split("?")[0]?.toLowerCase();
    const mime = (fileType || "").toLowerCase();

    if (
      messageType === "image" ||
      mime.startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "heic", "avif"].includes(ext)
    ) {
      messageType = "image";
    } else if (
      messageType === "video" ||
      mime.startsWith("video/") ||
      ["mp4", "webm", "mov", "mkv", "avi"].includes(ext)
    ) {
      messageType = "video";
    } else if (
      messageType === "audio" ||
      mime.startsWith("audio/") ||
      ["mp3", "wav", "ogg", "m4a"].includes(ext)
    ) {
      messageType = "audio";
    } else if (messageType !== "image" && messageType !== "video") {
      messageType = "file";
    }
  }

  // Ẩn lời nhắn phụ nếu nó chỉ là tên file trùng lặp hoặc chuỗi placeholder
  const isCaptionRedundant =
    caption === fileName ||
    caption === fileUrl ||
    caption === "[Hình ảnh]" ||
    caption === "[Video]" ||
    caption === "[Tệp đính kèm]";

  const displayCaption = isCaptionRedundant ? "" : caption;

  return { fileUrl, fileName, fileSize, fileType, messageType, displayCaption };
}

export default function MessageList({
  messages,
  accountId,
  isCustomer = false,
  customerName = "Khách hàng",
  hasMore,
  loadingMore,
  onLoadMore,
  onJumpToMessage,
  onReply,
}) {
  const bottomRef = useRef(null);
  const lastId = messages.at(-1)?.message_id;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [lastId]);

  // Cuộn mượt đến tin nhắn gốc khi bấm vào trích dẫn reply
  const scrollToMessage = (targetMessageId, targetMessage = null) => {
    if (!targetMessageId) return;
    const element = document.getElementById(`msg-${targetMessageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      const bubble = element.querySelector(".support-bubble");
      if (bubble) {
        bubble.classList.add("support-bubble-highlight");
        setTimeout(() => {
          bubble.classList.remove("support-bubble-highlight");
        }, 1800);
      }
      return;
    }

    // Nếu tin nhắn nằm ở phần cũ hơn chưa tải vào danh sách
    if (onJumpToMessage) {
      onJumpToMessage(targetMessageId, targetMessage);
    }
  };

  const getReplySenderName = (replyObj) => {
    if (!replyObj) return "Tin nhắn";
    const isReplySenderCustomer =
      replyObj.sender_role === "customer" || replyObj.sender_type === "customer";

    if (isCustomer) {
      if (isReplySenderCustomer || (accountId && String(replyObj.sender_id) === String(accountId))) {
        return "Bạn";
      }
      if (replyObj.sender_type === "ai") return "Selene AI";
      return "Nhân viên hỗ trợ";
    } else {
      if (isReplySenderCustomer) {
        return customerName || "Khách hàng";
      }
      if (replyObj.sender_type === "ai") return "Selene AI";
      if (accountId && String(replyObj.sender_id) === String(accountId)) {
        return "Bạn";
      }
      return "Nhân viên hỗ trợ";
    }
  };

  const getReplyText = (replyObj) => {
    if (!replyObj) return "";
    if (replyObj.message_type === "image") {
      return replyObj.content && replyObj.content !== "[Hình ảnh]" ? `[Hình ảnh] ${replyObj.content}` : "[Hình ảnh]";
    }
    if (replyObj.message_type === "video") {
      return replyObj.content && replyObj.content !== "[Video]" ? `[Video] ${replyObj.content}` : "[Video]";
    }
    if (replyObj.message_type === "audio") return "[Âm thanh]";
    if (replyObj.attachments && replyObj.attachments.length > 0) {
      return `[Tệp đính kèm] ${replyObj.attachments[0].file_name || ""}`;
    }
    return replyObj.content || "Tin nhắn";
  };

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
          <EmptyState text="Không có tin nhắn nào để hiển thị" />
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

        const { fileUrl, fileName, fileSize, messageType, displayCaption } = resolveMedia(message);

        // Nút trả lời hiển thị khi rơ chuột vào tin nhắn
        const actionButtons = (
          <div className="support-msg-actions">
            <button
              type="button"
              className="support-msg-action-btn reply-btn"
              title="Trả lời tin nhắn"
              onClick={() => onReply && onReply(message)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#0084ff">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </button>
          </div>
        );

        return (
          <div
            id={`msg-${message.message_id}`}
            key={message.message_id}
            className={`support-message-row${own ? " own" : ""}`}
          >
            {/* Nếu là tin nhắn của chính mình: nút hành động xuất hiện bên trái */}
            {own && actionButtons}

            <div className="support-bubble">
              {/* Hiển thị trích dẫn tin nhắn gốc nếu đây là tin nhắn reply */}
              {message.reply_to && (
                <div
                  className="support-reply-quote"
                  onClick={() => scrollToMessage(message.reply_to.message_id, message.reply_to)}
                  title="Nhấp để cuộn đến tin nhắn được trả lời"
                >
                  <div className="support-reply-quote-sender">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="me-1"
                    >
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <span>{getReplySenderName(message.reply_to)}</span>
                  </div>
                  <div className="support-reply-quote-text">
                    {getReplyText(message.reply_to)}
                  </div>
                </div>
              )}

              {/* 1. Tin nhắn Hình ảnh */}
              {fileUrl && messageType === "image" && (
                <div className="support-media-box">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Bấm để xem ảnh kích thước đầy đủ"
                  >
                    <img
                      src={fileUrl}
                      alt={fileName || "Hình ảnh đính kèm"}
                      className="support-img-preview"
                      loading="lazy"
                    />
                  </a>
                  {displayCaption && (
                    <div className="support-media-caption">{displayCaption}</div>
                  )}
                </div>
              )}

              {/* 2. Tin nhắn Video */}
              {fileUrl && messageType === "video" && (
                <div className="support-media-box">
                  <video
                    controls
                    src={fileUrl}
                    className="support-video-preview"
                    preload="metadata"
                  >
                    Trình duyệt không hỗ trợ phát video này.
                  </video>
                  {displayCaption && (
                    <div className="support-media-caption">{displayCaption}</div>
                  )}
                </div>
              )}

              {/* 3. Tin nhắn Âm thanh / Ghi âm */}
              {fileUrl && messageType === "audio" && (
                <div className="support-media-box">
                  <audio controls src={fileUrl} className="support-audio-preview" />
                  {displayCaption && (
                    <div className="support-media-caption">{displayCaption}</div>
                  )}
                </div>
              )}

              {/* 4. Tin nhắn Tệp tin / Tài liệu đính kèm */}
              {fileUrl && messageType === "file" && (
                <div className="support-file-box">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={fileName || true}
                    className="support-file-link"
                    title="Bấm để tải về"
                  >
                    <div className="support-file-icon">
                      <i className="bi bi-file-earmark-arrow-down-fill" />
                    </div>
                    <div className="support-file-meta">
                      <div className="support-file-title" title={fileName || "Tệp tin đính kèm"}>
                        {fileName || "Tệp tin đính kèm"}
                      </div>
                      {fileSize && (
                        <div className="support-file-size">{formatFileSize(fileSize)}</div>
                      )}
                    </div>
                    <i className="bi bi-download support-file-dl-icon" />
                  </a>
                  {displayCaption && (
                    <div className="support-media-caption mt-1">{displayCaption}</div>
                  )}
                </div>
              )}

              {/* 5. Tin nhắn văn bản thuần túy */}
              {!fileUrl && <div>{message.content}</div>}

              <small>
                {message.created_at && !isNaN(new Date(message.created_at).getTime())
                  ? new Date(message.created_at).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Vừa xong"}
                {own && <span className="ms-2">{message.is_read ? "Đã xem" : "Đã gửi"}</span>}
              </small>
            </div>

            {/* Nếu là tin nhắn của đối phương: nút hành động xuất hiện bên phải */}
            {!own && actionButtons}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

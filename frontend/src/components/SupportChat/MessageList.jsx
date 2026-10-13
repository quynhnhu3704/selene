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

        return (
          <div key={message.message_id} className={`support-message-row${own ? " own" : ""}`}>
            <div className="support-bubble">
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
                  ? new Date(message.created_at).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Vừa xong"}
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

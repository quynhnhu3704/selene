import EmptyState from "../common/EmptyState";
import Loading from "../common/Loading";
import { useEffect, useRef, useState } from "react";
import {
  ReactionPicker,
  ReactionBadge,
  ReactionDetailModal,
} from "./MessageReaction";

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

  let attachmentsList = Array.isArray(message.attachments) ? message.attachments : [];

  // Nếu tin nhắn có danh sách attachments từ bảng message_attachments
  if (attachmentsList.length > 0) {
    const firstAtt = attachmentsList[0];
    fileUrl = fileUrl || firstAtt.file_url;
    fileName = fileName || firstAtt.file_name;
    fileSize = fileSize || firstAtt.file_size;
    fileType = fileType || firstAtt.file_type;
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
    caption === "[Tệp đính kèm]" ||
    /^\[\d+\s+(hình ảnh|video|ghi âm|tệp đính kèm)\]$/i.test(caption.trim());

  const displayCaption = isCaptionRedundant ? "" : caption;

  return { fileUrl, fileName, fileSize, fileType, messageType, displayCaption, attachmentsList };
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
  onReact,
  onRemoveReaction,
}) {
  const [activePickerMessageId, setActivePickerMessageId] = useState(null);
  const [detailModalMessageId, setDetailModalMessageId] = useState(null);
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const lastId = messages.at(-1)?.message_id;

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distanceToBottom <= 80;
  };

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [lastId]);

  // Cuộn mượt đến tin nhắn gốc khi bấm vào trích dẫn reply
  const scrollToMessage = (targetMessageId, targetMessage = null) => {
    if (!targetMessageId) return;
    isAtBottomRef.current = false;
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
    <div
      ref={containerRef}
      onScroll={handleScroll}
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

        const { fileUrl, fileName, fileSize, messageType, displayCaption, attachmentsList } = resolveMedia(message);

        const hasReactions =
          Boolean(message.reaction_summary?.total > 0) ||
          Boolean(Array.isArray(message.reactions) && message.reactions.length > 0);

        const myReaction = Array.isArray(message.reactions)
          ? message.reactions.find((r) => String(r.account_id) === String(accountId))
          : null;
        const myReactionEmoji = myReaction?.reaction || null;

        // Nút hành động hiển thị khi rê chuột vào tin nhắn (Reaction + Reply)
        const actionButtons = (
          <div className="support-msg-actions">
            {/* Nút thả biểu cảm (Reaction) */}
            <button
              type="button"
              className={`support-msg-action-btn react-btn${
                activePickerMessageId === message.message_id ? " active" : ""
              }`}
              title="Bày tỏ cảm xúc"
              onClick={(e) => {
                e.stopPropagation();
                setActivePickerMessageId((prev) =>
                  prev === message.message_id ? null : message.message_id
                );
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>

            {/* Nút trả lời tin nhắn (Reply) */}
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
            className={`support-message-row${own ? " own" : ""}${
              hasReactions ? " has-reactions" : ""
            }`}
          >
            {/* Nếu là tin nhắn của chính mình: nút hành động xuất hiện bên trái */}
            {own && actionButtons}

            <div className={`support-bubble${hasReactions ? " has-reactions" : ""}`}>
              {/* Thanh chọn biểu cảm nổi bên trên tin nhắn (Capsule pill theo mẫu) */}
              {activePickerMessageId === message.message_id && (
                <ReactionPicker
                  currentReaction={myReactionEmoji}
                  onSelectReaction={(emoji) => {
                    setActivePickerMessageId(null);
                    onReact?.(message.message_id, emoji);
                  }}
                  onRemoveReaction={() => {
                    setActivePickerMessageId(null);
                    if (onRemoveReaction) {
                      onRemoveReaction(message.message_id);
                    } else if (onReact && myReactionEmoji) {
                      onReact(message.message_id, myReactionEmoji);
                    }
                  }}
                  onClose={() => setActivePickerMessageId(null)}
                />
              )}

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

              {/* Hiển thị danh sách nhiều tệp tin khi tin nhắn chứa nhiều attachments */}
              {attachmentsList && attachmentsList.length > 1 ? (
                <div className="support-multi-attachments">
                  <div
                    className="support-attachments-grid"
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      maxWidth: "420px",
                      marginTop: "2px",
                      marginBottom: "4px",
                    }}
                  >
                    {attachmentsList.map((att, idx) => {
                      const attUrl = att.file_url;
                      const attName = att.file_name || "file";
                      const attType = (att.file_type || "").toLowerCase();
                      const ext = (attName.split(".").pop() || "").toLowerCase();
                      const isImg =
                        attType.startsWith("image/") ||
                        ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "heic", "avif"].includes(ext);
                      const isVid =
                        attType.startsWith("video/") ||
                        ["mp4", "mov", "webm", "mkv", "avi"].includes(ext);
                      const isAud =
                        attType.startsWith("audio/") ||
                        ["mp3", "wav", "ogg", "m4a"].includes(ext);

                      if (isImg) {
                        return (
                          <a
                            key={att.attachment_id || idx}
                            href={attUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Xem ảnh: ${attName}`}
                            style={{
                              borderRadius: "8px",
                              overflow: "hidden",
                              border: "1px solid rgba(0,0,0,0.08)",
                              display: "inline-block",
                              flex: attachmentsList.length === 2 ? "1 1 calc(50% - 6px)" : "1 1 calc(33.3% - 6px)",
                              maxWidth: "180px",
                              minWidth: "95px",
                            }}
                          >
                            <img
                              src={attUrl}
                              alt={attName}
                              style={{
                                width: "100%",
                                height: "105px",
                                objectFit: "cover",
                                display: "block",
                              }}
                              loading="lazy"
                            />
                          </a>
                        );
                      }

                      if (isVid) {
                        return (
                          <div
                            key={att.attachment_id || idx}
                            style={{ width: "100%", maxWidth: "340px", marginBottom: "4px" }}
                          >
                            <video
                              controls
                              src={attUrl}
                              style={{ width: "100%", borderRadius: "8px", maxHeight: "200px" }}
                              preload="metadata"
                            />
                          </div>
                        );
                      }

                      if (isAud) {
                        return (
                          <div
                            key={att.attachment_id || idx}
                            style={{ width: "100%", maxWidth: "300px", marginBottom: "4px" }}
                          >
                            <audio controls src={attUrl} style={{ width: "100%" }} />
                          </div>
                        );
                      }

                      return (
                        <div
                          key={att.attachment_id || idx}
                          className="support-file-box"
                          style={{ width: "100%", marginBottom: "4px" }}
                        >
                          <a
                            href={attUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={attName || true}
                            className="support-file-link"
                            title="Bấm để tải về"
                          >
                            <div className="support-file-icon">
                              <i className="bi bi-file-earmark-arrow-down-fill" />
                            </div>
                            <div className="support-file-meta">
                              <div className="support-file-title" title={attName}>
                                {attName}
                              </div>
                              {att.file_size && (
                                <div className="support-file-size">
                                  {formatFileSize(att.file_size)}
                                </div>
                              )}
                            </div>
                            <i className="bi bi-download support-file-dl-icon" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                  {displayCaption && (
                    <div className="support-media-caption mt-1">{displayCaption}</div>
                  )}
                </div>
              ) : (
                <>
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
                </>
              )}

              <small>
                {message.created_at && !isNaN(new Date(message.created_at).getTime())
                  ? new Date(message.created_at).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Vừa xong"}
                {own && <span className="ms-2">{message.is_read ? "Đã xem" : "Đã gửi"}</span>}
              </small>

              {/* Huy hiệu tổng hợp cảm xúc gắn ở chân tin nhắn (như trong ảnh mẫu) */}
              {hasReactions && (
                <ReactionBadge
                  messageId={message.message_id}
                  reactions={message.reactions}
                  summary={message.reaction_summary}
                  currentAccountId={accountId}
                  own={own}
                  onClick={() => setDetailModalMessageId(message.message_id)}
                />
              )}
            </div>

            {/* Nếu là tin nhắn của đối phương: nút hành động xuất hiện bên phải */}
            {!own && actionButtons}
          </div>
        );
      })}

      {/* Modal chi tiết danh sách người thả cảm xúc */}
      {detailModalMessageId && (
        <ReactionDetailModal
          messageId={detailModalMessageId}
          isOpen={Boolean(detailModalMessageId)}
          onClose={() => setDetailModalMessageId(null)}
          currentAccountId={accountId}
          onRemoveMyReaction={(msgId) => {
            if (onRemoveReaction) {
              onRemoveReaction(msgId);
            } else if (onReact) {
              const targetMsg = messages.find(
                (m) => String(m.message_id) === String(msgId)
              );
              const myR = targetMsg?.reactions?.find(
                (r) => String(r.account_id) === String(accountId)
              );
              if (myR) onReact(msgId, myR.reaction);
            }
          }}
        />
      )}
      <div ref={bottomRef} />
    </div>
  );
}

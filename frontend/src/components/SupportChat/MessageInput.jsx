import { useRef, useState, useEffect } from "react";

export default function MessageInput({
  disabled,
  onSend,
  replyingTo = null,
  onCancelReply,
  customerName = "",
  isCustomer = false,
}) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const busyRef = useRef(false);

  // Tự động focus vào textarea khi người dùng bấm reply
  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 50 * 1024 * 1024) {
        alert("Kích thước tệp tin không được vượt quá 50MB!");
        e.target.value = "";
        return;
      }
      setFile(selected);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Trích xuất text xem trước của tin nhắn đang được reply
  const getReplyPreview = (msg) => {
    if (!msg) return "";
    if (msg.message_type === "image") {
      return msg.content && msg.content !== "[Hình ảnh]" ? `[Hình ảnh] ${msg.content}` : "[Hình ảnh]";
    }
    if (msg.message_type === "video") {
      return msg.content && msg.content !== "[Video]" ? `[Video] ${msg.content}` : "[Video]";
    }
    if (msg.message_type === "audio") return "[Âm thanh]";
    if (msg.attachments && msg.attachments.length > 0) {
      return `[Tệp đính kèm] ${msg.attachments[0].file_name || ""}`;
    }
    return msg.content || "Tin nhắn";
  };

  const submit = async (event) => {
    if (event) event.preventDefault();
    if (disabled || busyRef.current || (!content.trim() && !file)) return;
    busyRef.current = true;
    setSending(true);

    const payload = {
      content: content.trim(),
      file: file || null,
      reply_to_message_id: replyingTo?.message_id || null,
      client_id: crypto.randomUUID(),
    };

    try {
      await onSend(payload);
      setContent("");
      removeFile();
      if (onCancelReply) onCancelReply();
    } catch {
      // Giữ bản nháp để có thể thử lại
    } finally {
      busyRef.current = false;
      setSending(false);
    }
  };

  // Xác định placeholder: Admin hiển thị gợi ý tag tên khách hàng, Khách hàng hiển thị placeholder thân thiện
  const inputPlaceholder = disabled
    ? "Chưa thể gửi tin nhắn"
    : file
    ? "Thêm chú thích cho tệp tin (tùy chọn)..."
    : replyingTo
    ? `Trả lời tin nhắn...`
    : !isCustomer && customerName
    ? `Nhập @, tin nhắn tới ${customerName}`
    : "Nhập tin nhắn của bạn...";

  return (
    <div className="support-composer-wrapper">
      {/* 1. Thanh hiển thị tin nhắn đang được Reply (như hình mẫu) */}
      {replyingTo && (
        <div className="support-reply-banner">
          <div className="support-reply-banner-body">
            <div className="support-reply-banner-title">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="#0084ff"
                className="me-1.5"
                style={{ display: "inline-block", verticalAlign: "-2px" }}
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <span>Trả lời</span>
            </div>
            <div className="support-reply-banner-text" title={getReplyPreview(replyingTo)}>
              {getReplyPreview(replyingTo)}
            </div>
          </div>
          <button
            type="button"
            className="support-reply-banner-close"
            onClick={onCancelReply}
            title="Hủy trả lời"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
      )}

      {/* 2. Thanh xem trước tệp đính kèm nếu có */}
      {file && (
        <div className="support-file-preview-bar">
          <i className="bi bi-paperclip text-primary" />
          <span className="support-file-preview-name">{file.name}</span>
          <span className="text-muted" style={{ fontSize: "11px" }}>
            ({(file.size / 1024).toFixed(0)} KB)
          </span>
          <button
            type="button"
            className="support-file-remove-btn"
            onClick={removeFile}
            title="Hủy chọn tệp"
          >
            <i className="bi bi-x-circle-fill" />
          </button>
        </div>
      )}

      {/* 3. Form nhập liệu tin nhắn */}
      <form className="support-composer" onSubmit={submit}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
          disabled={disabled || sending}
        />
        <button
          type="button"
          className="support-composer-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
          title="Đính kèm hình ảnh, video hoặc tệp tin"
        >
          <i className="bi bi-paperclip" />
        </button>

        <textarea
          ref={textareaRef}
          aria-label="Nội dung tin nhắn"
          placeholder={inputPlaceholder}
          rows={2}
          maxLength={2000}
          value={content}
          disabled={disabled || sending}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && replyingTo) {
              onCancelReply?.();
            } else if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              submit(event);
            }
          }}
        />

        <button
          className="btn btn-dark"
          type="submit"
          disabled={disabled || sending || (!content.trim() && !file)}
          aria-label="Gửi tin nhắn"
          title="Gửi tin nhắn (Enter)"
        >
          {sending ? (
            <span className="spinner-border spinner-border-sm" />
          ) : (
            <i className="bi bi-send" />
          )}
        </button>
      </form>
    </div>
  );
}

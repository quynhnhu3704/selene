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
  const [files, setFiles] = useState([]);
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
    const selectedList = Array.from(e.target.files || []);
    if (selectedList.length > 0) {
      const valid = [];
      for (const selected of selectedList) {
        if (selected.size > 50 * 1024 * 1024) {
          alert(`Tệp "${selected.name}" vượt quá dung lượng tối đa 50MB!`);
        } else {
          valid.push(selected);
        }
      }
      setFiles((prev) => [...prev, ...valid].slice(0, 30));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearFiles = () => {
    setFiles([]);
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
    if (disabled || busyRef.current || (!content.trim() && files.length === 0)) return;
    busyRef.current = true;
    setSending(true);

    const payload = {
      content: content.trim(),
      files: files,
      file: files.length > 0 ? files[0] : null,
      reply_to_message_id: replyingTo?.message_id || null,
      client_id: crypto.randomUUID(),
    };

    try {
      await onSend(payload);
      setContent("");
      clearFiles();
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
    : files.length > 0
    ? files.length === 1
      ? `Đã chọn "${files[0].name}" (nhập chú thích nếu muốn)...`
      : `Đã chọn ${files.length} tệp tin (nhập chú thích nếu muốn)...`
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

      {/* 2. Thanh xem trước danh sách tệp đính kèm (hỗ trợ nhiều tệp) */}
      {files.length > 0 && (
        <div
          className="support-file-preview-bar"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            alignItems: "center",
            padding: "6px 12px",
            backgroundColor: "#f8f9fa",
            borderBottom: "1px solid #e9ecef",
          }}
        >
          {files.map((f, idx) => (
            <div
              key={idx}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#ffffff",
                border: "1px solid #dee2e6",
                borderRadius: "16px",
                padding: "2px 8px",
                fontSize: "12px",
              }}
            >
              <i
                className={
                  f.type.startsWith("image/")
                    ? "bi bi-image text-primary"
                    : f.type.startsWith("video/")
                    ? "bi bi-film text-danger"
                    : "bi bi-paperclip text-success"
                }
              />
              <span
                style={{
                  maxWidth: "130px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={f.name}
              >
                {f.name}
              </span>
              <span className="text-muted" style={{ fontSize: "10px" }}>
                ({(f.size / 1024).toFixed(0)} KB)
              </span>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#dc3545",
                  padding: 0,
                  cursor: "pointer",
                  display: "flex",
                }}
                title="Xóa tệp"
              >
                <i className="bi bi-x-circle-fill" />
              </button>
            </div>
          ))}
          {files.length > 1 && (
            <button
              type="button"
              onClick={clearFiles}
              className="btn btn-link btn-sm text-muted p-0 ms-auto"
              style={{ fontSize: "11px", textDecoration: "none" }}
            >
              Xóa tất cả ({files.length})
            </button>
          )}
        </div>
      )}

      {/* 3. Form nhập liệu tin nhắn */}
      <form className="support-composer" onSubmit={submit}>
        <input
          type="file"
          ref={fileInputRef}
          multiple
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
          title="Đính kèm hình ảnh, video hoặc tệp tin (hỗ trợ chọn nhiều tệp)"
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
          disabled={disabled || sending || (!content.trim() && files.length === 0)}
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

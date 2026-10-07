import { useRef, useState } from "react";

export default function MessageInput({ disabled, onSend }) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const busyRef = useRef(false);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      // Giới hạn 50MB
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

  const submit = async (event) => {
    event.preventDefault();
    if (disabled || busyRef.current || (!content.trim() && !file)) return;
    busyRef.current = true;
    setSending(true);

    const payload = {
      content: content.trim(),
      file: file || null,
      client_id: crypto.randomUUID(),
    };

    try {
      await onSend(payload);
      setContent("");
      removeFile();
    } catch {
      // Giữ bản nháp và mã gửi để có thể thử lại
    } finally {
      busyRef.current = false;
      setSending(false);
    }
  };

  return (
    <div className="support-composer-wrapper">
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
          aria-label="Nội dung tin nhắn"
          placeholder={
            disabled
              ? "Chưa thể gửi tin nhắn"
              : file
              ? "Thêm chú thích cho tệp tin (tùy chọn)..."
              : "Nhập tin nhắn của bạn..."
          }
          rows={2}
          maxLength={2000}
          value={content}
          disabled={disabled || sending}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              submit(event);
            }
          }}
        />

        <button
          className="btn btn-dark"
          type="submit"
          disabled={disabled || sending || (!content.trim() && !file)}
          aria-label="Gửi tin nhắn"
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

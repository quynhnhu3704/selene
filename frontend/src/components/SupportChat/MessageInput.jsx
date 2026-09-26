import { useRef, useState } from "react";

export default function MessageInput({ disabled, onSend }) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const pendingRef = useRef(null);
  const busyRef = useRef(false);
  const submit = async (event) => {
    event.preventDefault();
    if (disabled || busyRef.current || !content.trim()) return;
    busyRef.current = true;
    setSending(true);
    if (pendingRef.current?.content !== content.trim()) {
      pendingRef.current = {
        content: content.trim(),
        client_id: crypto.randomUUID(),
      };
    }
    try {
      await onSend(pendingRef.current);
      setContent("");
      pendingRef.current = null;
    } catch {
      // Giữ bản nháp và mã gửi để có thể thử lại mà không tạo tin nhắn trùng.
    } finally {
      busyRef.current = false;
      setSending(false);
    }
  };
  return (
    <form className="support-composer" onSubmit={submit}>
      <textarea
        aria-label="Nội dung tin nhắn"
        placeholder={
          disabled ? "Chưa thể gửi tin nhắn" : "Nhập tin nhắn của bạn..."
        }
        rows={2}
        maxLength={2000}
        value={content}
        disabled={disabled || sending}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          )
            submit(event);
        }}
      />
      <button
        className="btn btn-dark"
        type="submit"
        disabled={disabled || sending || !content.trim()}
        aria-label="Gửi tin nhắn"
      >
        {sending ? (
          <span className="spinner-border spinner-border-sm" />
        ) : (
          <i className="bi bi-send" />
        )}
      </button>
    </form>
  );
}

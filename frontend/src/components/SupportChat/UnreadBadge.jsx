import { useEffect, useState } from "react";
import { getConversations } from "../../services/chat.service";
import { createChatSocket } from "../../socket/chat.socket";
import { isLoggedIn } from "../../utils/auth";
import "./unread-badge.css";

export default function UnreadBadge({ admin = false }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!admin || !isLoggedIn()) return;

    let active = true;
    let requestVersion = 0;

    const fetchWaiting = async () => {
      const version = ++requestVersion;
      try {
        const res = await getConversations({ status: "waiting" });
        if (active && version === requestVersion) {
          const waitingCount =
            res?.data?.summary?.waitingCount ??
            (Array.isArray(res?.data?.data) ? res.data.data.length : 0);
          setCount(Number(waitingCount) || 0);
        }
      } catch {
        // Không hiển thị số cũ như thể vẫn còn chính xác khi tải thất bại.
        if (active && version === requestVersion) setCount(0);
      }
    };

    fetchWaiting();

    let socket = null;
    try {
      socket = createChatSocket();
      if (socket) {
        socket.on("connect", fetchWaiting);
        socket.on("conversation:update", fetchWaiting);
        socket.on("conversation:closed", fetchWaiting);
      }
    } catch {
      // bỏ qua lỗi socket
    }

    const refreshVisible = () => {
      if (document.visibilityState === "visible") fetchWaiting();
    };
    window.addEventListener("support:conversations-changed", fetchWaiting);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    const interval = setInterval(refreshVisible, 4000);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("support:conversations-changed", fetchWaiting);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      if (socket) {
        socket.off("connect", fetchWaiting);
        socket.off("conversation:update", fetchWaiting);
        socket.off("conversation:closed", fetchWaiting);
        socket.disconnect();
      }
    };
  }, [admin]);

  if (!count || count <= 0) return null;

  return (
    <span
      className="support-waiting-badge"
      title={`${count} cuộc trò chuyện đang chờ hỗ trợ`}
      aria-label={`${count} cuộc trò chuyện đang chờ hỗ trợ`}
      role="status"
    >
      {count > 99 ? "99+" : count} chờ
    </span>
  );
}



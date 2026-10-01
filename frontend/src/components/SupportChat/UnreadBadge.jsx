import { useEffect, useState } from "react";
import { getConversations } from "../../services/chat.service";
import { createChatSocket } from "../../socket/chat.socket";
import { isLoggedIn } from "../../utils/auth";

export default function UnreadBadge({ admin = false }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!admin || !isLoggedIn()) return;

    let active = true;

    const fetchWaiting = async () => {
      try {
        const res = await getConversations({ status: "waiting" });
        if (active) {
          const waitingCount =
            res?.data?.summary?.waitingCount ??
            (Array.isArray(res?.data?.data) ? res.data.data.length : 0);
          setCount(Number(waitingCount) || 0);
        }
      } catch {
        // Im lặng khi chưa có kết nối hoặc lỗi token
      }
    };

    fetchWaiting();

    let socket = null;
    try {
      socket = createChatSocket();
      if (socket) {
        socket.on("conversation:update", fetchWaiting);
      }
    } catch {
      // bỏ qua lỗi socket
    }

    const interval = setInterval(fetchWaiting, 30000);

    return () => {
      active = false;
      clearInterval(interval);
      if (socket) {
        socket.off("conversation:update", fetchWaiting);
      }
    };
  }, [admin]);

  if (!count || count <= 0) return null;

  return (
    <span
      className="badge bg-danger ms-2 rounded-pill"
      style={{ fontSize: "10px", padding: "2px 6px" }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}



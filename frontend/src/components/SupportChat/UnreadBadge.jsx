import { useEffect, useState } from "react";
import { getChatSession, getConversations, getMyConversations } from "../../services/chat.service";
import { createChatSocket } from "../../socket/chat.socket";
import { isLoggedIn } from "../../utils/auth";
import { canChat } from "./constants";

export default function UnreadBadge({ admin = false }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let socket;
    let active = true;
    let timer;
    let generation = 0;
    const start = async () => {
      const current = ++generation;
      socket?.dispose();
      clearInterval(timer);
      setCount(0);
      if (!isLoggedIn()) return;
      try {
        const res = await getChatSession();
        if (!active || current !== generation) return;
        const user = res.data.data;
        if (admin ? !canChat(user, "chat:view") : user.role !== "customer") return;
        const refresh = async () => {
          try {
            const result = admin ? await getConversations({ status: "waiting", limit: 1 }) : await getMyConversations();
            if (active && current === generation) setCount(admin ? result.data.waitingCount : result.data.data.reduce((sum, item) => sum + Number(item.customer_unread || 0), 0));
          } catch { if (active && current === generation) setCount(0); }
        };
        socket = createChatSocket();
        socket.on("conversation:update", refresh);
        socket.on("connect", refresh);
        socket.connect();
        refresh();
        timer = setInterval(refresh, 30000);
      } catch { /* Trang vẫn sử dụng được khi CSKH tạm thời không khả dụng. */ }
    };
    start();
    window.addEventListener("storage", start);
    window.addEventListener("login-success", start);
    return () => {
      active = false;
      socket?.dispose();
      clearInterval(timer);
      window.removeEventListener("storage", start);
      window.removeEventListener("login-success", start);
    };
  }, [admin]);
  return count > 0 ? <span className="badge rounded-pill text-bg-danger ms-2" aria-label={admin ? `${count} hội thoại chờ xử lý` : `${count} tin nhắn chưa đọc`}>{count > 99 ? "99+" : count}</span> : null;
}

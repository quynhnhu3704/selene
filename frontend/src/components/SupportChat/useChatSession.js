import { useEffect, useState } from "react";
import { getChatSession } from "../../services/chat.service";
import { createChatSocket } from "../../socket/chat.socket";

export default function useChatSession() {
  const [session, setSession] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let socket;
    const load = async () => {
      try {
        const res = await getChatSession();
        if (!active) return;
        socket = createChatSocket();
        socket.on("connect", () => setConnected(true));
        socket.on("disconnect", () => setConnected(false));
        setSession({ user: res.data.data, socket });
        setError("");
        socket.connect();
      } catch (err) { if (active) setError(err.response?.data?.message || "Không thể kết nối CSKH. Vui lòng thử lại."); }
    };
    load();
    return () => { active = false; socket?.dispose(); };
  }, [attempt]);
  return { session, connected, error, retry: () => setAttempt((value) => value + 1) };
}

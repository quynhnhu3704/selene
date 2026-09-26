import { useEffect, useState } from "react";
import { getChatSession } from "../../services/chat.service";
import { createChatSocket } from "../../socket/chat.socket";

export default function useChatSession() {
  const [session, setSession] = useState(null);
  const [connected] = useState(true);
  const [error] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const res = await getChatSession();
      if (!active) return;
      const socket = createChatSocket();
      setSession({ user: res.data.data, socket });
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return { session, connected, error, retry: () => {} };
}

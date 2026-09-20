import Loading from "../common/Loading";
import { useEffect, useRef, useState } from "react";
import { getMessages, readMessages, sendMessage } from "../../services/chat.service";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

const mergeMessages = (current, incoming) => {
  const map = new Map(current.map((message) => [message.message_id, message]));
  incoming.forEach((message) => map.set(message.message_id, {
    ...map.get(message.message_id), ...message,
    is_read: Boolean(message.is_read || map.get(message.message_id)?.is_read),
  }));
  return [...map.values()].sort((a, b) => Number(a.message_id) - Number(b.message_id));
};

export default function ChatPanel({ conversation, user, socket, canReply }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const messagesRef = useRef([]);
  const id = conversation.conversation_id;

  useEffect(() => {
    let active = true;
    let initialized = false;
    let refreshing = false;
    const markRead = async (items) => {
      if (document.visibilityState !== "visible") return;
      const incoming = items.filter((item) => !item.is_read && (user.role === "customer"
        ? item.sender_id !== user.accountId : item.sender_id === conversation.customer_id));
      if (!incoming.length) return;
      try {
        const res = await readMessages(id, incoming.at(-1).message_id);
        if (active) setMessages((current) => current.map((item) => res.data.data.includes(item.message_id) ? { ...item, is_read: true } : item));
      } catch (err) { if (active) setError(err.response?.data?.message || "Chưa thể đánh dấu đã đọc."); }
    };
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const res = await getMessages(id);
        if (!active) return;
        let incoming = res.data.data;
        const lastKnown = messagesRef.current.at(-1)?.message_id;
        let batch = incoming;
        while (lastKnown && batch.length === 50 && Number(batch[0].message_id) > Number(lastKnown)) {
          const older = await getMessages(id, { before: batch[0].message_id });
          if (!active) return;
          batch = older.data.data;
          incoming = [...batch, ...incoming];
        }
        setMessages((current) => mergeMessages(current, incoming));
        if (!initialized) setHasMore(res.data.data.length === 50);
        initialized = true;
        setLoading(false);
        await markRead(incoming);
      } catch (err) {
        if (active) { setLoading(false); setError(err.response?.data?.message || "Không thể tải tin nhắn."); }
      } finally { refreshing = false; }
    };
    const join = () => {
      socket.timeout(10000).emit("conversation:join", id, (err, result) => {
        if (!active) return;
        if (err || !result?.success) setError(result?.message || "Chưa kết nối được hội thoại. Đang thử lại...");
        else { setError(""); refresh(); }
      });
    };
    const onMessage = (message) => {
      if (message.conversation_id !== id) return;
      setMessages((current) => mergeMessages(current, [message]));
      markRead([message]);
    };
    const onRead = (data) => {
      if (data.conversation_id === id) setMessages((current) => current.map((item) => data.message_ids.includes(item.message_id) ? { ...item, is_read: true } : item));
    };
    const onVisible = () => { if (document.visibilityState === "visible") { markRead(messagesRef.current); refresh(); } };
    socket.on("connect", join);
    socket.on("message:new", onMessage);
    socket.on("message:read", onRead);
    document.addEventListener("visibilitychange", onVisible);
    refresh();
    if (socket.connected) join();
    // Đồng bộ lại cả khi sự kiện realtime bị mất sau lúc lưu dữ liệu.
    const timer = setInterval(refresh, 15000);
    return () => {
      active = false;
      clearInterval(timer);
      socket.emit("conversation:leave", id);
      socket.off("connect", join);
      socket.off("message:new", onMessage);
      socket.off("message:read", onRead);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id, socket, user.accountId, user.role, conversation.customer_id, retry]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await getMessages(id, { before: messages[0]?.message_id });
      setMessages((current) => mergeMessages(res.data.data, current));
      setHasMore(res.data.data.length === 50);
    } catch (err) { setError(err.response?.data?.message || "Không thể tải tin nhắn cũ."); }
    finally { setLoadingMore(false); }
  };
  const send = async (data) => {
    setError("");
    try {
      const res = await sendMessage(id, data);
      setMessages((current) => mergeMessages(current, [res.data.data]));
    } catch (err) {
      setError(err.response?.data?.message || "Chưa gửi được tin nhắn. Bạn có thể bấm gửi để thử lại.");
      throw err;
    }
  };
  return <div className="support-chat-panel">
    {error && <div className="alert alert-warning m-3 mb-0" role="alert">{error}
      <button className="btn btn-sm btn-link" onClick={() => { setError(""); setRetry((value) => value + 1); }}>Thử lại</button>
    </div>}
    {loading ? <div className="support-empty"><Loading text="Đang tải tin nhắn..." /></div> :
      <MessageList messages={messages} accountId={user.accountId} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} />}
    {conversation.status === "closed" && <div className="support-notice">Hội thoại đã kết thúc. Bạn vẫn có thể xem lại lịch sử.</div>}
    <MessageInput disabled={loading || !canReply || conversation.status === "closed"} onSend={send} />
  </div>;
}

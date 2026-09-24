import { useState } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

export default function ChatPanel({ conversation, user, canReply }) {
  const [messages, setMessages] = useState([
    {
      message_id: 1,
      conversation_id: conversation.conversation_id,
      sender_id: conversation.customer_id || 101,
      sender_role: "customer",
      content: "Xin chào, tôi cần hỗ trợ tư vấn sản phẩm.",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      is_read: true,
    },
    {
      message_id: 2,
      conversation_id: conversation.conversation_id,
      sender_id: 1,
      sender_role: "admin",
      content: "Chào bạn, Selene sẵn sàng hỗ trợ bạn. Bạn cần hỏi về sản phẩm nào?",
      created_at: new Date(Date.now() - 1800000).toISOString(),
      is_read: true,
    }
  ]);

  const send = (data) => {
    const newMsg = {
      message_id: Date.now(),
      conversation_id: conversation.conversation_id,
      sender_id: user?.accountId || user?.id || 1,
      sender_role: user?.role || "admin",
      content: data.content || "",
      created_at: new Date().toISOString(),
      is_read: true,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  return (
    <div className="support-chat-panel">
      <MessageList messages={messages} accountId={user?.accountId || 1} hasMore={false} loadingMore={false} />
      {conversation.status === "closed" && (
        <div className="support-notice">Hội thoại đã kết thúc. Bạn vẫn có thể xem lại lịch sử.</div>
      )}
      <MessageInput disabled={!canReply || conversation.status === "closed"} onSend={send} />
    </div>
  );
}


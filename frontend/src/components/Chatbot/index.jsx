import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { sendMessageToBot } from "../../services/chatbot.service";
import { getMyMessages, sendTextMessage } from "../../services/chat.service";
import { createChatSocket } from "../../socket/chat.socket";
import { isLoggedIn } from "../../utils/auth";
import defaultProduct from "../../assets/images/default-product.png";

import BOT_AVATAR from "../../assets/images/default-chatbot.png";

// Giữ giao diện chat mẫu, nhận văn bản và sản phẩm riêng từ API của Selene.
function Chatbot() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [conversationStatus, setConversationStatus] = useState("open");
  const messagesEndRef = useRef(null);
  const sendingRef = useRef(false);

  // Cuộn đến tin mới khi mở cửa sổ hoặc chờ trợ lý phản hồi.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, isSending, open]);

  // Tải danh sách tin nhắn của khách hàng từ getMyMessages
  const fetchHistory = useCallback(async (isSilent = false) => {
    if (!isLoggedIn()) return;
    if (!isSilent) setIsLoadingMessages(true);

    try {
      const res = await getMyMessages({ limit: 10 });
      const data = res?.data?.data;
      if (data) {
        if (data.status) setConversationStatus(data.status);
        if (data.pagination) setPagination(data.pagination);
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.warn("Chưa thể tải lịch sử tin nhắn:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Khi mở cửa sổ chat, tự động tải tin nhắn từ API getMyMessages
  useEffect(() => {
    if (open) {
      fetchHistory(false);
    }
  }, [open, fetchHistory]);

  // Lắng nghe cập nhật realtime qua Socket.IO
  useEffect(() => {
    if (!isLoggedIn()) return;
    let socket = null;
    try {
      socket = createChatSocket();
      if (socket) {
        socket.on("message:new", (newMsg) => {
          if (!newMsg) return;
          setMessages((prev) => {
            if (prev.some((m) => m.message_id === newMsg.message_id)) return prev;
            return [...prev, newMsg];
          });
        });

        socket.on("conversation:update", () => {
          fetchHistory(true);
        });
      }
    } catch (err) {
      console.warn("Lỗi socket chatbot:", err);
    }

    return () => {
      if (socket) {
        socket.off("message:new");
        socket.off("conversation:update");
        socket.disconnect();
      }
    };
  }, [fetchHistory]);

  // Tải thêm tin nhắn cũ hơn
  const handleLoadMore = async () => {
    const cursor = pagination?.next_cursor || pagination?.oldest_message_id;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await getMyMessages({ before: cursor, limit: 10 });
      const data = res?.data?.data;
      if (data?.messages) {
        setMessages((prev) => [...data.messages, ...prev]);
        setPagination(data.pagination || null);
      }
    } catch (err) {
      console.error("Lỗi khi tải thêm tin nhắn cũ:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Gửi tin nhắn loại text vào CSKH (POST /api/chat/messages/text)
  const send = async () => {
    if (!message.trim() || sendingRef.current) return;
    const text = message.trim();

    if (!isLoggedIn()) {
      setMessages((prev) => [
        ...prev,
        {
          message_id: "err-" + Date.now(),
          role: "bot",
          sender_role: "ai",
          content: "Bạn vui lòng đăng nhập để gửi tin nhắn hỗ trợ nhé!",
          text: "Bạn vui lòng đăng nhập để gửi tin nhắn hỗ trợ nhé!",
          isError: true,
          created_at: new Date().toISOString(),
        },
      ]);
      return;
    }

    const userMsg = {
      message_id: "client-" + Date.now(),
      role: "user",
      sender_role: "customer",
      content: text,
      text: text,
      created_at: new Date().toISOString(),
    };

    sendingRef.current = true;
    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setIsSending(true);

    try {
      /*
      // =========================================================================
      // COMMENT LẠI POST /api/chatbot 200 THEO YÊU CẦU:
      // =========================================================================
      const history = messages
        .filter((item) => !item.isError)
        .slice(-10)
        .map(({ role, text, content, sender_role }) => ({
          role: role || (sender_role === "customer" ? "user" : "bot"),
          text: text || content || "",
        }));

      const result = await sendMessageToBot(text, history);
      setMessages((prev) => [
        ...prev,
        {
          message_id: "bot-" + Date.now(),
          role: "bot",
          sender_role: "ai",
          content: result.data.reply,
          text: result.data.reply,
          products: result.data.products,
          created_at: new Date().toISOString(),
        },
      ]);
      */

      // Gửi tin nhắn loại text lên hệ thống CSKH: POST /api/chat/messages/text
      const res = await sendTextMessage({ content: text });
      const resData = res?.data?.data;
      if (resData?.message) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.message_id !== userMsg.message_id);
          return [...filtered, resData.message];
        });
      }
      if (resData?.conversation?.status) {
        setConversationStatus(resData.conversation.status);
      }
    } catch (err) {
      console.error("Lỗi khi gửi tin nhắn:", err);
      setMessages((prev) => [
        ...prev,
        {
          message_id: "err-" + Date.now(),
          role: "bot",
          sender_role: "ai",
          content:
            err?.response?.data?.message ||
            "Có lỗi xảy ra khi gửi tin nhắn, bạn thử lại nhé...",
          text:
            err?.response?.data?.message ||
            "Có lỗi xảy ra khi gửi tin nhắn, bạn thử lại nhé...",
          isError: true,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  // Bật hoặc đóng cửa sổ mà vẫn giữ nội dung hội thoại hiện tại.
  const toggleChat = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div className="selene-chatbot">
      <style>{CHATBOT_STYLES}</style>
      <button
        type="button"
        className={`chatbot-fab ${open ? "open" : ""}`}
        onClick={toggleChat}
        aria-label={open ? "Đóng chatbot" : "Mở chatbot"}
        aria-expanded={open}
        aria-controls="selene-chatbot-window"
      >
        <span className="fab-icon">
          <i className={open ? "bi bi-x" : "bi bi-robot"}></i>
        </span>
      </button>

      {open && (
        <div
          className="chatbot-window"
          id="selene-chatbot-window"
          role="region"
          aria-label="Trợ lý ảo Selene"
        >
          <div className="chatbot-header">
            <div className="header-left">
              <div className="avatar-online">
                <img src={BOT_AVATAR} alt="" />
              </div>
              <div className="header-info">
                <h5 className="fw-semibold mb-0">Trợ lý ảo Selene</h5>
                <span className="status">
                  {conversationStatus === "processing"
                    ? "Đang hỗ trợ"
                    : conversationStatus === "waiting"
                    ? "Chờ hỗ trợ"
                    : "Online"}
                </span>
              </div>
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="refresh-btn"
                onClick={() => fetchHistory(false)}
                disabled={isLoadingMessages}
                title="Tải lại tin nhắn"
              >
                <i className={`bi bi-arrow-clockwise${isLoadingMessages ? " spin" : ""}`} />
              </button>
              <button
                type="button"
                className="close-btn"
                onClick={() => setOpen(false)}
                aria-label="Đóng chatbot"
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
          </div>

          <div
            className="chatbot-messages"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {pagination?.has_more && (
              <button
                type="button"
                className="btn-load-more"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                <i className="bi bi-clock-history" />
                {loadingMore ? "Đang tải..." : "Xem tin nhắn cũ hơn"}
              </button>
            )}

            {isLoadingMessages && messages.length === 0 && (
              <div className="text-center py-5 text-muted">
                <div className="spinner-border spinner-border-sm mb-2" role="status" />
                <p style={{ fontSize: "13px" }}>Đang tải lịch sử tin nhắn...</p>
              </div>
            )}

            {messages.length === 0 && !isLoadingMessages && (
              <div className="welcome-message">
                <p>Xin chào! 👋</p>
                <p>Bạn đang tìm trang phục nào ạ? Mình giúp được ngay nè!</p>
                {!isLoggedIn() && (
                  <p className="mt-2 text-muted" style={{ fontSize: "12px" }}>
                    (Vui lòng đăng nhập để xem lịch sử tin nhắn hỗ trợ)
                  </p>
                )}
              </div>
            )}

            {messages.map((msg, index) => {
              const isCustomer = msg.sender_role === "customer" || msg.role === "user";
              const isStaff = msg.sender_role === "staff";
              const isAi = msg.sender_role === "ai" || msg.role === "bot";
              const textContent = msg.content || msg.text || "";
              const timeString = msg.created_at
                ? new Date(msg.created_at).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <div
                  key={msg.message_id || index}
                  className={`message-row ${isCustomer ? "user" : "bot"}`}
                >
                  {!isCustomer && (
                    <div className="bot-avatar">
                      <img src={BOT_AVATAR} alt="" />
                    </div>
                  )}
                  <div className={`bubble ${isCustomer ? "user" : "bot"}`}>
                    {isStaff && (
                      <span className="sender-badge">
                        <i className="bi bi-person-badge me-1" />
                        Nhân viên hỗ trợ
                      </span>
                    )}
                    <div className="bubble-content">{textContent}</div>
                    {timeString && <div className="bubble-time">{timeString}</div>}
                    {msg.products?.length > 0 && (
                      <div className="chatbot-products">
                        {msg.products.map((product) => (
                          <Link
                            className="chatbot-product"
                            key={product.product_id}
                            to={`/san-pham/${encodeURIComponent(product.product_id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={product.image_url || defaultProduct}
                              alt=""
                            />
                            <div className="chatbot-product-info">
                              <div className="chatbot-product-name">
                                {product.product_name}
                              </div>
                              <div className="chatbot-product-price">
                                {Number(product.discount_price ?? product.original_price ?? 0).toLocaleString("vi-VN")}đ
                                {product.original_price > (product.discount_price ?? product.original_price) && (
                                  <span className="chatbot-product-original">{Number(product.original_price).toLocaleString("vi-VN")}đ</span>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="message-row bot">
                <div className="bot-avatar">
                  <img src={BOT_AVATAR} alt="" />
                </div>
                <div
                  className="bubble bot typing"
                  role="status"
                  aria-label="Đang trả lời"
                >
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-area">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hỏi về trang phục, so sánh, giá tốt..."
              aria-label="Tin nhắn cho trợ lý Selene"
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={isSending}
            />
            <button
              type="button"
              className={`send-btn ${!message.trim() || isSending ? "disabled" : ""}`}
              onClick={send}
              disabled={!message.trim() || isSending}
              aria-label="Gửi tin nhắn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// CSS của chatbot đặt tại component, dùng bảng màu Selene và selector riêng.
const CHATBOT_STYLES = `

.selene-chatbot .chatbot-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #871b1b;
  color: white;
  border: none;
  font-size: 28px;
  box-shadow: 0 4px 20px rgba(135, 27, 27, 0.2);
  cursor: pointer;
  transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1002; 
}

.selene-chatbot .chatbot-fab:hover {
  transform: scale(1.05) translateY(-4px);
  box-shadow: 0 16px 40px rgba(135, 27, 27, 0.38);
}

.selene-chatbot .chatbot-fab .fab-icon {
  font-size: 28px;
  font-weight: bold;
  line-height: 1;
  transition: transform 0.3s ease;
}

.selene-chatbot .chatbot-fab.open .fab-icon {
  transform: rotate(180deg);
  font-size: 36px; 
}

.selene-chatbot .chatbot-window {
  position: fixed;
  bottom: 100px;          
  right: 24px;
  width: 380px;
  height: 560px;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 30px rgba(135, 27, 27, 0.25), 0 4px 8px rgba(0,0,0,0.1); 
  backdrop-filter: blur(10px);
  animation: selene-chatbot-popup 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 10001; 
}



@keyframes selene-chatbot-popup {
  from { opacity: 0; transform: scale(0.84) translateY(40px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.selene-chatbot .chatbot-header {
  background: linear-gradient(135deg, #871b1b, #6f1515);
  color: white;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selene-chatbot .header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selene-chatbot .avatar-online {
  position: relative;
}

.selene-chatbot .avatar-online img {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.28);
}

.selene-chatbot .status {
  font-size: 12px;
  background: rgba(255, 255, 255, 0.22);
  padding: 2px 10px;
  border-radius: 20px;
  font-weight: 600;
  font-family: inherit;
}

.selene-chatbot .close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
  opacity: 0.92;
  transition: all 0.3s ease;
}

.selene-chatbot .close-btn:hover {
  opacity: 0.75;
}

.selene-chatbot .chatbot-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selene-chatbot .message-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  max-width: 85%;
}

.selene-chatbot .message-row.user {
  margin-left: auto;
  flex-direction: row-reverse;
}

.selene-chatbot .bubble {
  padding: 12px 16px;
  border-radius: 20px;
  font-size: 15px;
  line-height: 1.45;
  position: relative;
  word-break: break-word;
  font-family: inherit;
}

.selene-chatbot .bubble.user {
  background: #871b1b;
  color: white;
  border-bottom-right-radius: 5px;
}

.selene-chatbot .bubble.bot {
  background: white;
  color: #212529;
  border-bottom-left-radius: 5px;
  box-shadow: 0 3px 12px rgba(135, 27, 27, 0.08);
}

.selene-chatbot .bubble-content {
  white-space: pre-wrap;
}

.selene-chatbot .bot-avatar img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  margin-bottom: 4px;
  border: 2px solid #fbc5c5;
}

.selene-chatbot .welcome-message {
  text-align: center;
  color: #6c757d;
  margin: 60px 0 40px;
  font-size: 15px;
}

.selene-chatbot .welcome-message p:first-child {
  font-size: 22px;
  font-weight: 700;
  color: #871b1b;
  margin-bottom: 8px;
}

.selene-chatbot .typing {
  padding: 12px 16px;
  width: 80px;
  display: flex;
  gap: 6px;
  align-items: center;
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.selene-chatbot .dot {
  width: 8px;
  height: 8px;
  background: #6c757d;
  border-radius: 50%;
  animation: selene-chatbot-typing 1.4s infinite ease-in-out;
}

.selene-chatbot .dot:nth-child(2) { animation-delay: 0.2s; }
.selene-chatbot .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes selene-chatbot-typing {
  0%, 60%, 100% { transform: translateY(0); }
  30%           { transform: translateY(-6px); }
}

.selene-chatbot .chatbot-input-area {
  padding: 16px 20px;
  background: #fff;
  border-top: 1px solid rgba(135, 27, 27, 0.12);
  display: flex;
  gap: 12px;
}

.selene-chatbot .chatbot-input-area input {
  flex: 1;
  padding: 14px 18px;
  border: 1px solid rgba(135, 27, 27, 0.2);
  border-radius: 999px;
  font-size: 15px;
  outline: none;
  transition: all 0.25s ease;
  font-family: inherit;
  background: #f5f5f5;
  color: #212529;
}

.selene-chatbot .chatbot-input-area input:focus {
  border-color: #871b1b;
  box-shadow: 0 0 0 3px rgba(135, 27, 27, 0.18);
  background: white;
}

.selene-chatbot .chatbot-input-area input::placeholder {
  color: #6c757d;
}

.selene-chatbot .send-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #871b1b;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.selene-chatbot .send-btn:hover:not(.disabled) {
  background: #6f1515;
  transform: scale(1.1) translateY(-1px);
  box-shadow: 0 8px 20px rgba(135, 27, 27, 0.3);
}

.selene-chatbot .send-btn.disabled {
  background: #d1d5db;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.selene-chatbot .bubble-time {
  font-size: 10px;
  margin-top: 4px;
  opacity: 0.75;
  text-align: right;
  line-height: 1;
}
.selene-chatbot .bubble.user .bubble-time {
  color: rgba(255, 255, 255, 0.85);
}
.selene-chatbot .bubble.bot .bubble-time {
  color: #777;
}
.selene-chatbot .sender-badge {
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #871b1b;
  display: block;
}
.selene-chatbot .btn-load-more {
  background: #fff;
  border: 1px solid #e0dcd9;
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 12px;
  color: #555;
  cursor: pointer;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}
.selene-chatbot .btn-load-more:hover {
  background: #f0eeeb;
  color: #111;
}
.selene-chatbot .header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.selene-chatbot .refresh-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  transition: opacity 0.2s;
}
.selene-chatbot .refresh-btn:hover {
  opacity: 1;
}
.selene-chatbot .spin {
  animation: selene-spin 1s linear infinite;
}
@keyframes selene-spin {
  100% { transform: rotate(360deg); }
}

.selene-chatbot .chatbot-window {
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 124px);
}
.selene-chatbot .chatbot-messages { min-height: 0; }
.selene-chatbot .chatbot-input-area input { min-width: 0; }
.selene-chatbot .send-btn, .selene-chatbot .bot-avatar { flex-shrink: 0; }
.selene-chatbot .bubble { min-width: 0; }
.selene-chatbot .chatbot-products {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin: 12px 0;
}
.selene-chatbot .chatbot-product {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
  text-decoration: none;
  color: inherit;
}
.selene-chatbot .chatbot-product img {
  width: 100%;
  height: 120px;
  object-fit: contain;
  display: block;
}
.selene-chatbot .chatbot-product-info { padding: 8px 10px; }
.selene-chatbot .chatbot-product-name {
  font-weight: 700;
  font-size: 13px;
  line-height: 1.2;
  margin-bottom: 4px;
}
.selene-chatbot .chatbot-product-price {
  color: #871b1b;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 4px;
}
.selene-chatbot .chatbot-product-original {
  font-size: 11px;
  color: #999;
  text-decoration: line-through;
  margin-left: 6px;
}
`;

export default Chatbot;

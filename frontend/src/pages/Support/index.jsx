import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import ChatPanel from "../../components/SupportChat/ChatPanel";
import { STATUS_LABELS } from "../../components/SupportChat/constants";
import { getMyMessages, sendTextMessage } from "../../services/chat.service";
import { createChatSocket } from "../../socket/chat.socket";
import { getUser, isLoggedIn } from "../../utils/auth";
import { toast } from "react-toastify";
import "../../components/SupportChat/support.css";

function CustomerSupport() {
  const isAuth = isLoggedIn();
  const rawUser = getUser();
  const currentUser = {
    accountId: rawUser?.accountId || rawUser?.account_id || rawUser?.id,
    full_name: rawUser?.full_name || rawUser?.username || "Khách hàng",
    role: "customer",
  };

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const socketRef = useRef(null);

  // Gửi tin nhắn loại text lên server (POST /api/chat/messages/text)
  const handleSendMessage = async (data) => {
    if (!data?.content) return;
    const content = data.content.trim();
    if (!content) return;

    try {
      const payload = {
        content,
        conversation_id: conversation?.conversation_id || undefined,
      };

      const res = await sendTextMessage(payload);
      const resData = res?.data?.data;
      const createdMessage = resData?.message;
      const updatedConv = resData?.conversation;

      if (createdMessage) {
        setMessages((prev) => {
          if (prev.some((m) => m.message_id === createdMessage.message_id)) {
            return prev;
          }
          return [...prev, createdMessage];
        });
      }

      if (updatedConv) {
        setConversation((prev) => ({
          ...(prev || {}),
          ...updatedConv,
        }));

        if (socketRef.current && updatedConv.conversation_id) {
          socketRef.current.emit("conversation:join", updatedConv.conversation_id);
        }
      }
    } catch (err) {
      console.error("Lỗi khi gửi tin nhắn:", err);
      const errorMessage =
        err?.response?.data?.message ||
        "Không thể gửi tin nhắn. Vui lòng kiểm tra lại kết nối!";
      toast.error(errorMessage);
      throw err; // Ném lỗi để MessageInput giữ lại nội dung đang gõ của người dùng
    }
  };

  // Mở lại cuộc trò chuyện khi đã kết thúc bằng cách gửi tin nhắn tiếp tục hỗ trợ
  const handleReopen = async () => {
    try {
      await handleSendMessage({ content: "Xin chào, tôi cần được hỗ trợ tiếp ạ." });
      toast.success("Đã mở lại cuộc trò chuyện!");
    } catch {
      // handleSendMessage đã bắt và thông báo lỗi
    }
  };

  // Hàm tải danh sách tin nhắn của khách hàng từ API getMyMessages
  const fetchMessages = useCallback(async (isSilent = false) => {
    if (!isAuth) {
      setLoading(false);
      return;
    }
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const res = await getMyMessages({ limit: 10 });
      const data = res?.data?.data;
      if (data) {
        setConversation({
          conversation_id: data.conversation_id,
          customer_id: data.customer_id,
          customer_name: data.customer_name || currentUser.full_name,
          status: data.status || "waiting",
        });
        setMessages(data.messages || []);
        setPagination(data.pagination || null);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách tin nhắn khách hàng:", err);
      setError(
        err?.response?.data?.message ||
          "Không thể tải danh sách tin nhắn. Vui lòng thử lại sau."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuth, currentUser.full_name]);

  // Tải thêm tin nhắn cũ hơn khi kéo lên hoặc bấm xem tin cũ hơn
  const handleLoadMore = async () => {
    const cursor = pagination?.next_cursor || pagination?.oldest_message_id;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);

    try {
      const res = await getMyMessages({ before: cursor, limit: 10 });
      const data = res?.data?.data;
      if (data) {
        const olderMessages = data.messages || [];
        setMessages((prev) => [...olderMessages, ...prev]);
        setPagination(data.pagination || null);
      }
    } catch (err) {
      console.error("Lỗi khi tải thêm tin nhắn cũ:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Khởi tạo và lắng nghe realtime socket
  useEffect(() => {
    if (!isAuth) return;

    fetchMessages(false);

    let socket = null;
    try {
      socket = createChatSocket();
      socketRef.current = socket;
      if (socket) {
        if (socket.connected) setConnectionStatus("online");

        socket.on("connect", () => {
          setConnectionStatus("online");
          if (conversation?.conversation_id) {
            socket.emit("conversation:join", conversation.conversation_id);
          }
        });

        socket.on("disconnect", () => {
          setConnectionStatus("offline");
        });

        socket.on("connect_error", () => {
          setConnectionStatus("offline");
        });

        // Nhận tin nhắn mới theo thời gian thực
        socket.on("message:new", (newMsg) => {
          if (!newMsg) return;
          setMessages((prev) => {
            if (prev.some((m) => m.message_id === newMsg.message_id)) {
              return prev;
            }
            return [...prev, newMsg];
          });
          setConversation((prev) =>
            prev
              ? {
                  ...prev,
                  last_message: newMsg.content,
                  last_message_at: newMsg.created_at,
                }
              : prev
          );
        });

        // Nhận sự kiện cập nhật hội thoại -> tải lại tin nhắn
        socket.on("conversation:update", () => {
          fetchMessages(true);
        });
      } else {
        setConnectionStatus("offline");
      }
    } catch {
      setConnectionStatus("offline");
    }

    // Polling định kỳ mỗi 30s phòng mất kết nối
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 30000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
        socket.off("message:new");
        socket.off("conversation:update");
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [isAuth, fetchMessages]);

  // Tự động tham gia phòng hội thoại khi conversation_id thay đổi
  useEffect(() => {
    if (socketRef.current && conversation?.conversation_id) {
      socketRef.current.emit("conversation:join", conversation.conversation_id);
    }
  }, [conversation?.conversation_id]);

  if (!isAuth) {
    return (
      <div className="support-empty py-5">
        <i className="bi bi-person-lock" />
        <h5>Bạn chưa đăng nhập</h5>
        <p>Vui lòng đăng nhập để xem danh sách tin nhắn và trao đổi với nhân viên hỗ trợ.</p>
        <Link to="/tai-khoan/dang-nhap" className="btn btn-dark mt-2">
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  const currentStatus = conversation?.status || "waiting";

  return (
    <div className="support-workspace">
      {/* Sidebar hội thoại của khách hàng */}
      <aside className="support-conversations">
        <div className="support-conversations-header d-flex align-items-center justify-content-between">
          <strong>Hội thoại của bạn</strong>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => fetchMessages(false)}
            disabled={loading || refreshing}
            title="Tải lại tin nhắn"
          >
            <i className={`bi bi-arrow-clockwise${refreshing ? " spin-anim" : ""}`} />
          </button>
        </div>

        <div className="support-conversation-scroll">
          <button
            type="button"
            className="support-conversation selected"
          >
            <div className="support-avatar active">
              <i className="bi bi-headset" />
            </div>
            <div className="support-conv-content">
              <div className="support-conv-header">
                <span className="support-conv-name">Selene Support</span>
              </div>
              <div className="support-preview">
                {messages.length > 0
                  ? messages[messages.length - 1]?.content || "Đang trao đổi tin nhắn"
                  : "Bắt đầu cuộc trò chuyện với tư vấn viên"}
              </div>
              <div className="support-conv-footer">
                <span className={`support-status ${currentStatus}`}>
                  {STATUS_LABELS[currentStatus] || "Chờ hỗ trợ"}
                </span>
                <span className="text-muted" style={{ fontSize: "11px" }}>
                  {messages.length} tin nhắn
                </span>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main chat section */}
      <section className="support-main">
        <div className="support-chat-header">
          <div>
            <strong>Chat với nhân viên Selene</strong>
            <span className={`support-connection ${connectionStatus} ms-2`}>
              <span className="support-connection-dot" />
              {connectionStatus === "online"
                ? "Trực tuyến"
                : connectionStatus === "connecting"
                ? "Đang kết nối..."
                : "Ngoại tuyến"}
            </span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className={`support-status ${currentStatus}`}>
              {STATUS_LABELS[currentStatus] || "Chờ hỗ trợ"}
            </span>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => fetchMessages(false)}
              disabled={loading || refreshing}
            >
              <i className={`bi bi-arrow-clockwise me-1${refreshing ? " spin-anim" : ""}`} />
              Làm mới
            </button>
          </div>
        </div>

        <ChatPanel
          key={conversation?.conversation_id || "my-conversation"}
          conversation={conversation || { conversation_id: null, status: "waiting" }}
          user={currentUser}
          messages={messages}
          loading={loading}
          error={error}
          pagination={pagination}
          loadingMore={loadingMore}
          onLoadMore={handleLoadMore}
          onSend={handleSendMessage}
          onReopen={handleReopen}
          isClosed={currentStatus === "closed"}
          canReply={true}
        />
      </section>
    </div>
  );
}

export default function Support() {
  return (
    <div className="support-page">
      <h1 className="support-title">Chăm sóc khách hàng</h1>
      <p className="support-subtitle">
        Kết nối trực tiếp với nhân viên Selene để được hỗ trợ về đơn hàng và sản phẩm.
      </p>
      <CustomerSupport />
    </div>
  );
}

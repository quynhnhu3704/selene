import { useEffect, useState, useCallback, useRef } from "react";
import ChatPanel from "../../../components/SupportChat/ChatPanel";
import {
  STATUS_FILTERS,
  getStatusLabel,
  getStatusClass,
} from "../../../components/SupportChat/constants";
import CustomerInfo from "./components/CustomerInfo";
import { getConversations } from "../../../services/chat.service";
import { createChatSocket } from "../../../socket/chat.socket";
import { getUser } from "../../../utils/auth";
import "../../../components/SupportChat/support.css";

// Helper định dạng thời gian thân thiện cho danh sách hội thoại
function formatConversationTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeString = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) {
    return timeString;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Hôm qua ${timeString}`;
  }

  return `${date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} ${timeString}`;
}

// Lấy chữ cái đầu làm avatar
function getAvatarInitial(name) {
  if (!name || typeof name !== "string") return "K";
  const trimmed = name.trim();
  const parts = trimmed.split(" ");
  const lastPart = parts[parts.length - 1];
  return lastPart.charAt(0).toUpperCase() || "K";
}

function SupportInbox() {
  const [conversations, setConversations] = useState([]);
  const [summary, setSummary] = useState({
    waitingCount: 0,
    processingCount: 0,
    closedCount: 0,
  });
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  // Thông tin user đăng nhập
  const currentUser = getUser() || {
    accountId: 1,
    full_name: "Admin",
    role: "admin",
    permissions: ["chat:view", "chat:assign", "chat:close", "chat:reply"],
  };

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Hàm tải danh sách cuộc trò chuyện từ API
  const fetchList = useCallback(
    async (statusFilter, searchQuery, isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError("");

      try {
        const params = {};
        if (statusFilter && statusFilter !== "all") {
          params.status = statusFilter;
        }
        if (searchQuery && searchQuery.trim()) {
          params.search = searchQuery.trim();
        }
        if (statusFilter === "waiting" || statusFilter === "pending") {
          params.order = "asc";
        }

        const res = await getConversations(params);
        const data = res?.data?.data || [];
        const summaryData = res?.data?.summary || {
          waitingCount: 0,
          processingCount: 0,
          closedCount: 0,
        };

        setConversations(data);
        setSummary(summaryData);

        // Duy trì hội thoại đã chọn nếu còn tồn tại, không tự động chọn mặc định
        setSelectedId((prev) => {
          if (prev && data.some((item) => String(item.conversation_id) === String(prev))) {
            return prev;
          }
          return null;
        });
      } catch (err) {
        console.error("Lỗi khi tải danh sách cuộc trò chuyện:", err);
        setError(
          err?.response?.data?.message ||
            "Không thể kết nối đến máy chủ hoặc chưa có quyền xem hội thoại."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Gọi API mỗi khi thay đổi filter status hoặc debounced search
  useEffect(() => {
    fetchList(status, debouncedSearch, false);
  }, [status, debouncedSearch, fetchList]);

  // Kết nối Socket.IO để nhận thông báo realtime khi có hội thoại mới hoặc cập nhật trạng thái
  const statusRef = useRef(status);
  const searchRef = useRef(debouncedSearch);
  statusRef.current = status;
  searchRef.current = debouncedSearch;

  useEffect(() => {
    let socket = null;
    try {
      socket = createChatSocket();
      if (socket) {
        if (socket.connected) {
          setConnectionStatus("online");
        }

        socket.on("connect", () => {
          setConnectionStatus("online");
        });

        socket.on("disconnect", () => {
          setConnectionStatus("offline");
        });

        socket.on("connect_error", () => {
          setConnectionStatus("offline");
        });

        // Nhận sự kiện có cập nhật cuộc trò chuyện -> cập nhật lại danh sách âm thầm
        socket.on("conversation:update", () => {
          fetchList(statusRef.current, searchRef.current, true);
        });
      } else {
        setConnectionStatus("offline");
      }
    } catch {
      setConnectionStatus("offline");
    }

    // Polling định kỳ mỗi 25s phòng trường hợp mất kết nối socket
    const interval = setInterval(() => {
      fetchList(statusRef.current, searchRef.current, true);
    }, 25000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
        socket.off("conversation:update");
        socket.disconnect();
      }
    };
  }, [fetchList]);

  // Xử lý gán xử lý hội thoại
  const handleAssign = () => {
    if (!selectedId) return;
    setConversations((prev) =>
      prev.map((item) =>
        item.conversation_id === selectedId
          ? {
              ...item,
              status: "active",
              assigned_staff_id: currentUser.accountId,
            }
          : item
      )
    );
  };

  // Xử lý đóng hội thoại
  const handleClose = () => {
    if (!selectedId) return;
    setConversations((prev) =>
      prev.map((item) =>
        item.conversation_id === selectedId ? { ...item, status: "closed" } : item
      )
    );
  };

  const selected = selectedId
    ? conversations.find((item) => String(item.conversation_id) === String(selectedId)) || null
    : null;

  const assignedToMe = selected?.assigned_staff_id === currentUser.accountId;
  const totalCount =
    (summary.waitingCount || 0) +
    (summary.processingCount || 0) +
    (summary.closedCount || 0);

  // Lấy số lượng theo tab filter
  const getFilterBadgeCount = (key) => {
    switch (key) {
      case "all":
        return totalCount;
      case "waiting":
        return summary.waitingCount || 0;
      case "processing":
        return summary.processingCount || 0;
      case "closed":
        return summary.closedCount || 0;
      default:
        return 0;
    }
  };

  const isWaitingTab = status === "waiting" || status === "pending";

  // Sắp xếp danh sách hội thoại:
  // - Riêng tab 'Chờ hỗ trợ' (waiting/pending): Sắp xếp thời gian tăng dần (cũ nhất / chờ lâu nhất lên đầu - FIFO)
  // - Các tab khác: Ưu tiên trạng thái đang xử lý lên đầu, sau đó theo thời gian giảm dần (mới nhất lên đầu)
  const sortedConversations = [...conversations].sort((a, b) => {
    const timeA = new Date(a.last_message_at || a.created_at || 0).getTime();
    const timeB = new Date(b.last_message_at || b.created_at || 0).getTime();

    if (isWaitingTab) {
      return timeA - timeB;
    }

    const isAProcessing =
      a.status === "processing" || a.status === "open" || a.status === "active";
    const isBProcessing =
      b.status === "processing" || b.status === "open" || b.status === "active";

    if (isAProcessing && !isBProcessing) return -1;
    if (!isAProcessing && isBProcessing) return 1;

    return timeB - timeA;
  });

  return (
    <>
      {/* Tiêu đề & Thống kê trạng thái */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="support-title">Hỗ trợ khách hàng</h1>
          <div className="support-summary-chips mt-2">
            <span className="support-chip">
              <i className="bi bi-chat-dots text-muted" />
              Tổng cộng: <strong className="support-chip-count">{totalCount}</strong>
            </span>
            <span className="support-chip waiting">
              <i className="bi bi-clock-history text-warning" />
              Chờ hỗ trợ: <strong className="support-chip-count">{summary.waitingCount || 0}</strong>
            </span>
            <span className="support-chip processing">
              <i className="bi bi-arrow-repeat text-success" />
              Đang xử lý: <strong className="support-chip-count">{summary.processingCount || 0}</strong>
            </span>
            <span className="support-chip closed">
              <i className="bi bi-check2-circle text-secondary" />
              Đã đóng: <strong className="support-chip-count">{summary.closedCount || 0}</strong>
            </span>
          </div>
        </div>

        {/* Trạng thái kết nối & Nút làm mới */}
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={() => fetchList(status, debouncedSearch, false)}
            disabled={loading || refreshing}
            title="Tải lại danh sách"
          >
            <i className={`bi bi-arrow-clockwise ${refreshing || loading ? "spin-anim" : ""}`} />
            <span>{refreshing ? "Đang tải..." : "Làm mới"}</span>
          </button>

          <span className={`support-connection ${connectionStatus}`}>
            <span className="support-connection-dot" />
            {connectionStatus === "online" && "Trực tuyến"}
            {connectionStatus === "connecting" && "Đang kết nối..."}
            {connectionStatus === "offline" && "Ngoại tuyến"}
          </span>
        </div>
      </div>

      {/* Workspace chính */}
      <div className="support-workspace">
        {/* Cột trái: Bộ lọc & Danh sách cuộc trò chuyện */}
        <aside className="support-conversations">
          {/* Tabs bộ lọc trạng thái */}
          <div
            className="support-filter-tabs"
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            {STATUS_FILTERS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`support-filter-tab${status === tab.key ? " active" : ""}`}
                onClick={() => setStatus(tab.key)}
              >
                <i className={`bi ${tab.icon}`} />
                <span>{tab.label}</span>
                <span className="badge bg-secondary">{getFilterBadgeCount(tab.key)}</span>
              </button>
            ))}
          </div>

          {/* Ô tìm kiếm hội thoại */}
          <div className="support-search-box">
            <i className="bi bi-search support-search-icon" />
            <input
              type="text"
              className="support-search-input"
              placeholder="Tìm theo tên khách, nội dung..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="support-search-clear"
                onClick={() => setSearch("")}
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Gợi ý thứ tự chờ tăng dần cho tab Chờ hỗ trợ */}
          {isWaitingTab && (
            <div className="support-sort-hint">
              <i className="bi bi-clock-history" />
              <span>Sắp xếp: Thời gian tăng dần (cũ nhất trước)</span>
            </div>
          )}

          {/* Danh sách cuộn */}
          <div className="support-conversation-scroll">
            {/* Lỗi khi tải */}
            {error && (
              <div className="p-3 text-center">
                <div className="alert alert-danger py-2 px-3 small mb-2">{error}</div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => fetchList(status, debouncedSearch, false)}
                >
                  <i className="bi bi-arrow-clockwise me-1" /> Thử lại
                </button>
              </div>
            )}

            {/* Skeleton loading khi đang tải lần đầu */}
            {loading && !error && (
              <div>
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div key={idx} className="support-skeleton-item">
                    <div className="support-skeleton-avatar" />
                    <div className="flex-1 w-100">
                      <div className="support-skeleton-line" style={{ width: "60%" }} />
                      <div className="support-skeleton-line" style={{ width: "85%" }} />
                      <div className="support-skeleton-line" style={{ width: "40%" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Trạng thái rỗng */}
            {!loading && !error && sortedConversations.length === 0 && (
              <div className="support-empty py-5">
                <i className="bi bi-chat-left-dots" />
                <h5>Không có cuộc trò chuyện</h5>
                <p>
                  {search
                    ? `Không tìm thấy kết quả phù hợp với "${search}"`
                    : "Chưa có cuộc trò chuyện nào trong trạng thái này."}
                </p>
                {search && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary mt-2"
                    onClick={() => setSearch("")}
                  >
                    Xóa tìm kiếm
                  </button>
                )}
              </div>
            )}

            {/* Danh sách cuộc trò chuyện */}
            {!loading &&
              !error &&
              sortedConversations.map((item) => {
                const isSelected = String(selectedId) === String(item.conversation_id);
                const statusClass = getStatusClass(item.status);
                const statusLabel = getStatusLabel(item.status);
                const customerName = item.customer_name || "Khách hàng";
                const avatarChar = getAvatarInitial(customerName);
                const timeText = formatConversationTime(
                  item.last_message_at || item.created_at
                );

                return (
                  <button
                    key={item.conversation_id}
                    type="button"
                    className={`support-conversation${isSelected ? " selected" : ""}`}
                    onClick={() => setSelectedId(item.conversation_id)}
                  >
                    {/* Avatar */}
                    <div className={`support-avatar ${statusClass}`}>
                      {avatarChar}
                    </div>

                    {/* Nội dung tóm tắt */}
                    <div className="support-conv-content">
                      <div className="support-conv-header">
                        <strong className="support-conv-name" title={customerName}>
                          {customerName}
                        </strong>
                        {timeText && (
                          <small className="support-conv-time">{timeText}</small>
                        )}
                      </div>

                      <div className="support-preview" title={item.last_message || ""}>
                        {item.last_message || "Chưa có tin nhắn mới"}
                      </div>

                      <div className="support-conv-footer">
                        <span className={`support-status ${statusClass}`}>
                          {statusLabel}
                        </span>

                        {Number(item.staff_unread) > 0 && (
                          <span className="support-unread">
                            {item.staff_unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </aside>

        {/* Cột giữa: Khung chat chi tiết */}
        <section className="support-main">
          {selected ? (
            <>
              <div className="support-chat-header">
                <div>
                  <strong>{selected.customer_name || selected.customer?.full_name || "Khách hàng"}</strong>
                  <div className="mt-1 d-flex align-items-center gap-2">
                    <span className={`support-status ${getStatusClass(selected.status)}`}>
                      {getStatusLabel(selected.status)}
                    </span>
                    <small className="text-muted">
                      Mã: {selected.conversation_id}
                    </small>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  {(selected.status === "waiting" || selected.status === "pending") && (
                    <button
                      type="button"
                      className="btn btn-dark btn-sm"
                      onClick={handleAssign}
                    >
                      Nhận xử lý
                    </button>
                  )}
                  {selected.status !== "closed" && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={handleClose}
                    >
                      Đóng hội thoại
                    </button>
                  )}
                </div>
              </div>

              {selected.status !== "closed" && !assignedToMe && (
                <div className="support-notice">
                  {selected.assigned_staff_id
                    ? "Hội thoại đang được nhân viên khác xử lý."
                    : "Nhận xử lý hội thoại để gửi tin nhắn hỗ trợ khách hàng."}
                </div>
              )}

              <ChatPanel
                key={selected.conversation_id}
                conversation={selected}
                user={currentUser}
                canReply={assignedToMe || selected.status === "waiting"}
              />
            </>
          ) : (
            <div className="support-empty">
              <i className="bi bi-chat-square-text" />
              <h5>Chọn một cuộc trò chuyện để bắt đầu</h5>
              <p>Chọn cuộc trò chuyện từ danh sách bên trái để xem nội dung và trả lời khách hàng.</p>
            </div>
          )}
        </section>

        {/* Cột phải: Thông tin khách hàng & đơn hàng */}
        {selected && (
          <CustomerInfo
            customer={
              selected.customer || {
                full_name: selected.customer_name,
                email: selected.customer_email || "Chưa có email",
                phone_number: selected.customer_phone || "Chưa có số điện thoại",
              }
            }
            canViewOrder={true}
          />
        )}
      </div>
    </>
  );
}

export default function AdminSupport() {
  return <SupportInbox />;
}

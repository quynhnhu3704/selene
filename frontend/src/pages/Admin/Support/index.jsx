import { useEffect, useState, useCallback, useRef } from "react";
import ChatPanel from "../../../components/SupportChat/ChatPanel";
import {
  STATUS_FILTERS,
  getStatusLabel,
  getStatusClass,
} from "../../../components/SupportChat/constants";
import CustomerInfo from "./components/CustomerInfo";
import {
  getConversations,
  getConversationDetails,
  reopenConversation,
} from "../../../services/chat.service";
import { createChatSocket } from "../../../socket/chat.socket";
import { getUser } from "../../../utils/auth";
import { toast } from "react-toastify";
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

  // Chi tiết tin nhắn & dữ liệu cuộc hội thoại đang chọn
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

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
  const selectedIdRef = useRef(selectedId);
  statusRef.current = status;
  searchRef.current = debouncedSearch;
  selectedIdRef.current = selectedId;

  // Lấy chi tiết cuộc trò chuyện và danh sách tin nhắn từ API
  const fetchDetail = useCallback(async (conversationId) => {
    if (!conversationId) return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await getConversationDetails(conversationId);
      const data = res?.data?.data || null;
      setDetailData(data);
    } catch (err) {
      console.error("Lỗi khi tải chi tiết tin nhắn:", err);
      setDetailError(
        err?.response?.data?.message || "Không thể tải danh sách tin nhắn của cuộc trò chuyện."
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

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
        socket.on("conversation:update", (payload) => {
          fetchList(statusRef.current, searchRef.current, true);
          if (
            payload?.conversation_id &&
            String(payload.conversation_id) === String(selectedIdRef.current)
          ) {
            fetchDetail(payload.conversation_id);
          }
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
  }, [fetchList, fetchDetail]);

  const selected = selectedId
    ? conversations.find((item) => String(item.conversation_id) === String(selectedId)) || null
    : null;

  const currentUserId = currentUser?.accountId ?? currentUser?.account_id ?? currentUser?.id;
  const currentStatus = (detailData?.status || selected?.status || "").toLowerCase();
  const isPending = currentStatus === "pending" || currentStatus === "waiting";
  const isProcessing =
    currentStatus === "processing" || currentStatus === "active" || currentStatus === "open";
  const isClosed = currentStatus === "closed";

  const assignedStaffId = detailData?.assigned_staff_id ?? selected?.assigned_staff_id;
  const isAssignedToMe = Boolean(
    (assignedStaffId != null &&
      currentUserId != null &&
      String(assignedStaffId) === String(currentUserId)) ||
    (detailData?.messages &&
      detailData.messages.some(
        (m) =>
          m.sender_role === "staff" &&
          currentUserId != null &&
          String(m.sender_id) === String(currentUserId)
      ))
  );

  // Điều kiện hiển thị theo yêu cầu:
  // 1. Trạng thái processing + người tham gia đoạn chat là nhân viên đang đăng nhập:
  //    -> Hiển thị tin nhắn, thông tin khách hàng, đơn hàng, thanh gửi tin nhắn
  // 2. Trạng thái pending (giống đã đóng):
  //    -> Hiển thị tin nhắn thôi, không hiển thị thông tin khách hàng/đơn hàng, ẩn thanh gửi tin nhắn
  // 3. Trạng thái closed:
  //    -> Hiển thị tin nhắn thôi, không hiển thị thông tin khách hàng/đơn hàng, ẩn thanh gửi tin nhắn
  const canShowMessages = (isProcessing && isAssignedToMe) || isClosed || isPending;
  const canShowCustomerInfo = isProcessing && isAssignedToMe;
  const canSendMessage = isProcessing && isAssignedToMe;

  // Tự động tải tin nhắn khi chọn cuộc hội thoại thỏa điều kiện
  useEffect(() => {
    if (!selectedId) {
      setDetailData(null);
      setDetailError("");
      return;
    }

    const currentConv = conversations.find(
      (item) => String(item.conversation_id) === String(selectedId)
    );
    const rawStatus = (currentConv?.status || "").toLowerCase();
    const itemIsAssignedToMe = Boolean(
      currentConv?.assigned_staff_id != null &&
      currentUserId != null &&
      String(currentConv.assigned_staff_id) === String(currentUserId)
    );
    const itemIsProcessingOther =
      (rawStatus === "processing" || rawStatus === "active" || rawStatus === "open") &&
      !itemIsAssignedToMe &&
      currentConv?.assigned_staff_id != null;

    if (itemIsProcessingOther) {
      setDetailData(null);
      setDetailLoading(false);
      setDetailError("");
      return;
    }

    // Tải tin nhắn cho cuộc trò chuyện (pending, closed, hoặc processing)
    fetchDetail(selectedId);
  }, [selectedId, selected?.status, selected?.assigned_staff_id, currentUserId, fetchDetail]);

  // Xử lý gán xử lý hội thoại
  const handleAssign = () => {
    if (!selectedId) return;
    const staffId = currentUserId || 1;
    setConversations((prev) =>
      prev.map((item) =>
        String(item.conversation_id) === String(selectedId)
          ? {
            ...item,
            status: "processing",
            assigned_staff_id: staffId,
          }
          : item
      )
    );

    setSummary((prev) => ({
      ...prev,
      waitingCount: Math.max(0, (prev.waitingCount || 0) - 1),
      processingCount: (prev.processingCount || 0) + 1,
    }));

    // Tải tin nhắn và thông tin chi tiết ngay khi nhận xử lý
    fetchDetail(selectedId);
  };

  // Xử lý đóng hội thoại
  const handleClose = () => {
    if (!selectedId) return;
    setConversations((prev) =>
      prev.map((item) =>
        String(item.conversation_id) === String(selectedId)
          ? { ...item, status: "closed" }
          : item
      )
    );

    setSummary((prev) => ({
      ...prev,
      processingCount: Math.max(0, (prev.processingCount || 0) - 1),
      closedCount: (prev.closedCount || 0) + 1,
    }));

    setDetailData((prev) => (prev ? { ...prev, status: "closed" } : prev));
    toast.info("Đã đóng cuộc trò chuyện!");
  };

  // Xử lý mở lại hội thoại đã đóng
  const handleReopen = async () => {
    if (!selectedId) return;
    const staffId = currentUserId || 1;

    try {
      if (typeof reopenConversation === "function") {
        await reopenConversation(selectedId);
      }
    } catch (err) {
      console.error("Lỗi khi mở lại hội thoại:", err);
    }

    setConversations((prev) =>
      prev.map((item) =>
        String(item.conversation_id) === String(selectedId)
          ? {
              ...item,
              status: "processing",
              assigned_staff_id: staffId,
            }
          : item
      )
    );

    setSummary((prev) => ({
      ...prev,
      closedCount: Math.max(0, (prev.closedCount || 0) - 1),
      processingCount: (prev.processingCount || 0) + 1,
    }));

    setDetailData((prev) =>
      prev
        ? {
            ...prev,
            status: "processing",
            assigned_staff_id: staffId,
          }
        : prev
    );

    toast.success("Đã mở lại cuộc trò chuyện thành công!");
    fetchDetail(selectedId);
  };

  // Gửi tin nhắn mới trong khung chat
  const handleSendMessage = (data) => {
    if (!selectedId || !data?.content) return;
    const content = data.content.trim();
    if (!content) return;

    const newMsg = {
      message_id: Date.now(),
      conversation_id: selectedId,
      sender_id: currentUserId || 1,
      sender_role: currentUser?.role || "admin",
      content: content,
      created_at: new Date().toISOString(),
      is_read: true,
    };

    setDetailData((prev) => ({
      ...prev,
      messages: [...(prev?.messages || []), newMsg],
    }));

    setConversations((prev) =>
      prev.map((item) =>
        String(item.conversation_id) === String(selectedId)
          ? {
            ...item,
            last_message: content,
            last_message_at: newMsg.created_at,
          }
          : item
      )
    );
  };

  // Tải thêm tin nhắn cũ hơn
  const handleLoadMore = async () => {
    if (!selectedId || loadingMore || !detailData?.pagination?.has_more) return;
    setLoadingMore(true);
    try {
      const beforeCursor =
        detailData.pagination?.next_cursor || detailData.messages?.[0]?.created_at;
      const res = await getConversationDetails(selectedId, { before: beforeCursor });
      const newData = res?.data?.data;
      if (newData?.messages?.length) {
        setDetailData((prev) => ({
          ...prev,
          messages: [...newData.messages, ...(prev?.messages || [])],
          pagination: newData.pagination,
        }));
      }
    } catch (err) {
      console.error("Lỗi khi tải thêm tin nhắn cũ:", err);
    } finally {
      setLoadingMore(false);
    }
  };
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
                  <strong>
                    {detailData?.customer_name ||
                      detailData?.customer?.full_name ||
                      selected.customer_name ||
                      "Khách hàng"}
                  </strong>
                  <div className="mt-1 d-flex align-items-center gap-2">
                    <span className={`support-status ${getStatusClass(currentStatus)}`}>
                      {getStatusLabel(currentStatus)}
                    </span>
                    <small className="text-muted">
                      Mã: {selected.conversation_id}
                    </small>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  {isPending && (
                    <button
                      type="button"
                      className="btn btn-dark btn-sm"
                      onClick={handleAssign}
                    >
                      Nhận xử lý
                    </button>
                  )}
                  {!isClosed && !isPending && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={handleClose}
                    >
                      Đóng hội thoại
                    </button>
                  )}
                  {isClosed && (
                    <button
                      type="button"
                      className="btn btn-dark btn-sm d-inline-flex align-items-center gap-1"
                      onClick={handleReopen}
                    >
                      <i className="bi bi-arrow-counterclockwise" />
                      <span>Mở lại hội thoại</span>
                    </button>
                  )}
                </div>
              </div>

              <ChatPanel
                key={selected.conversation_id}
                conversation={selected}
                user={currentUser}
                messages={detailData?.messages || []}
                loading={detailLoading}
                error={detailError}
                pagination={detailData?.pagination}
                loadingMore={loadingMore}
                onLoadMore={handleLoadMore}
                onSend={handleSendMessage}
                onAssign={handleAssign}
                onReopen={handleReopen}
                canShowMessages={canShowMessages}
                canSendMessage={canSendMessage}
                isPending={isPending}
                isProcessing={isProcessing}
                isClosed={isClosed}
                isAssignedToMe={isAssignedToMe}
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
        {selected && canShowCustomerInfo && (
          <CustomerInfo
            customer={{
              ...(detailData?.customer || {
                full_name: selected.customer_name,
                email: selected.customer_email || "Chưa có email",
                phone_number: selected.customer_phone || "Chưa có số điện thoại",
              }),
              orders: detailData?.orders || [],
            }}
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

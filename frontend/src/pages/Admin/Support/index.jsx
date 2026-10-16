import EmptyState from "../../../components/common/EmptyState";
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
  assignConversation,
  closeConversation,
  sendTextMessage,
  sendAttachmentMessage,
  replyMessage,
  reactToMessage,
  removeReaction,
} from "../../../services/chat.service";
import { createChatSocket } from "../../../socket/chat.socket";
import { getUser } from "../../../utils/auth";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
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
  const [assigning, setAssigning] = useState(false);
  const [closing, setClosing] = useState(false);
  const socketRef = useRef(null);

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
  const detailDataRef = useRef(detailData);
  statusRef.current = status;
  searchRef.current = debouncedSearch;
  selectedIdRef.current = selectedId;
  detailDataRef.current = detailData;
  const jumpingRef = useRef(false);

  // Lấy chi tiết cuộc trò chuyện và danh sách tin nhắn từ API
  const fetchDetail = useCallback(async (conversationId, isSilent = false) => {
    if (!conversationId) return;
    if (!isSilent) setDetailLoading(true);
    setDetailError("");
    try {
      const res = await getConversationDetails(conversationId);
      const data = res?.data?.data || null;
      if (data) {
        setDetailData((prev) => {
          if (!prev || String(prev.conversation_id) !== String(conversationId)) {
            return data;
          }
          const prevMsgs = prev.messages || [];
          const newMsgs = data.messages || [];
          const map = new Map();
          prevMsgs.forEach((m) => {
            if (m.message_id) map.set(String(m.message_id), m);
          });
          newMsgs.forEach((m) => {
            if (m.message_id) map.set(String(m.message_id), m);
          });
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
          );
          return {
            ...data,
            messages: merged,
          };
        });
      }
    } catch (err) {
      console.error("Lỗi khi tải chi tiết tin nhắn:", err);
      if (!isSilent) {
        setDetailError(
          err?.response?.data?.message || "Không thể tải danh sách tin nhắn của cuộc trò chuyện."
        );
      }
    } finally {
      if (!isSilent) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    let socket = null;
    try {
      socket = createChatSocket();
      socketRef.current = socket;
      if (socket) {
        if (socket.connected) {
          setConnectionStatus("online");
          if (selectedIdRef.current) {
            socket.emit("conversation:join", selectedIdRef.current);
          }
        }

        socket.on("connect", () => {
          setConnectionStatus("online");
          if (selectedIdRef.current) {
            socket.emit("conversation:join", selectedIdRef.current);
          }
        });

        socket.on("disconnect", () => {
          setConnectionStatus("offline");
        });

        socket.on("connect_error", () => {
          setConnectionStatus("offline");
        });

        // Nhận tin nhắn mới theo thời gian thực mượt mà
        socket.on("message:new", (newMsg) => {
          if (!newMsg) return;
          if (String(newMsg.conversation_id) === String(selectedIdRef.current)) {
            setDetailData((prev) => {
              if (!prev) return prev;
              if (prev.messages?.some((m) => String(m.message_id) === String(newMsg.message_id))) {
                return prev;
              }
              return {
                ...prev,
                messages: [...(prev.messages || []), newMsg],
              };
            });
          }
        });

        // Nhận sự kiện có cập nhật cuộc trò chuyện -> cập nhật lại danh sách và tin nhắn âm thầm (mượt mà không hiện loading)
        socket.on("conversation:update", (payload) => {
          fetchList(statusRef.current, searchRef.current, true);
          if (
            payload?.conversation_id &&
            String(payload.conversation_id) === String(selectedIdRef.current)
          ) {
            fetchDetail(payload.conversation_id, true);
          }
        });

        // Nhận sự kiện đóng cuộc hội thoại realtime
        socket.on("conversation:closed", (payload) => {
          fetchList(statusRef.current, searchRef.current, true);
          if (
            payload?.conversation_id &&
            String(payload.conversation_id) === String(selectedIdRef.current)
          ) {
            setDetailData((prev) => (prev ? { ...prev, status: "closed" } : prev));
            fetchDetail(payload.conversation_id, true);
          }
        });

        // Nhận sự kiện cập nhật biểu cảm tin nhắn (Reaction) realtime
        socket.on("message:reaction", (payload) => {
          if (!payload?.message_id) return;
          if (
            !payload.conversation_id ||
            String(payload.conversation_id) === String(selectedIdRef.current)
          ) {
            setDetailData((prev) => {
              if (!prev || !prev.messages) return prev;
              return {
                ...prev,
                messages: prev.messages.map((m) => {
                  if (String(m.message_id) === String(payload.message_id)) {
                    return {
                      ...m,
                      reactions: payload.reactions || [],
                      reaction_summary:
                        payload.summary || {
                          total: (payload.reactions || []).length,
                        },
                    };
                  }
                  return m;
                }),
              };
            });
          }
        });
      } else {
        setConnectionStatus("offline");
      }
    } catch {
      setConnectionStatus("offline");
    }

    // Polling định kỳ âm thầm mỗi 4s phòng trường hợp mất kết nối socket
    const interval = setInterval(() => {
      fetchList(statusRef.current, searchRef.current, true);
      if (selectedIdRef.current) {
        fetchDetail(selectedIdRef.current, true);
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
        socket.off("message:new");
        socket.off("conversation:update");
        socket.off("conversation:closed");
        socket.off("message:reaction");
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [fetchList, fetchDetail]);

  // Tham gia phòng Socket khi đổi cuộc hội thoại được chọn
  useEffect(() => {
    if (socketRef.current && selectedId) {
      socketRef.current.emit("conversation:join", selectedId);
    }
  }, [selectedId]);

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
    // Nếu đã có dữ liệu tin nhắn của hội thoại này rồi thì tải âm thầm để giao diện mượt mà
    const isAlreadyLoaded = detailData && String(detailData.conversation_id) === String(selectedId);
    fetchDetail(selectedId, isAlreadyLoaded);
  }, [selectedId, selected?.status, selected?.assigned_staff_id, currentUserId, fetchDetail]);

  // Xử lý nhận xử lý cuộc trò chuyện
  const handleAssign = async () => {
    if (!selectedId || assigning) return;
    setAssigning(true);

    try {
      const staffName = currentUser?.full_name || currentUser?.username;
      const res = await assignConversation(selectedId, {
        staff_name: staffName,
      });

      const resData = res?.data?.data;
      const updatedConv = resData?.conversation;
      const greetingMsg = resData?.message;

      toast.success(res?.data?.message || "Đã nhận xử lý cuộc trò chuyện thành công!");

      // 1. Cập nhật danh sách cuộc hội thoại
      setConversations((prev) =>
        prev.map((item) => {
          if (String(item.conversation_id) === String(selectedId)) {
            return {
              ...item,
              status: updatedConv?.status || "active",
              assigned_staff_id: updatedConv?.assigned_staff_id || currentUserId,
              last_message: greetingMsg?.content || item.last_message,
              last_message_at: greetingMsg?.created_at || item.last_message_at,
            };
          }
          return item;
        })
      );

      // 2. Cập nhật tóm tắt số lượng trên các tab
      const prevStatus = (detailData?.status || selected?.status || "").toLowerCase();
      const isFromClosed = prevStatus === "closed";
      const isFromWaiting = prevStatus === "waiting" || prevStatus === "pending";

      setSummary((prev) => ({
        ...prev,
        waitingCount: isFromWaiting
          ? Math.max(0, (prev.waitingCount || 0) - 1)
          : prev.waitingCount,
        closedCount: isFromClosed
          ? Math.max(0, (prev.closedCount || 0) - 1)
          : prev.closedCount,
        processingCount: (prev.processingCount || 0) + 1,
      }));

      // 3. Cập nhật chi tiết hội thoại hiện tại
      setDetailData((prev) => {
        if (!prev) return prev;
        const currentMsgs = prev.messages || [];
        const hasMsg =
          greetingMsg &&
          currentMsgs.some((m) => m.message_id === greetingMsg.message_id);
        const updatedMsgs = hasMsg
          ? currentMsgs
          : greetingMsg
          ? [...currentMsgs, greetingMsg]
          : currentMsgs;

        return {
          ...prev,
          status: updatedConv?.status || "processing",
          assigned_staff_id: updatedConv?.assigned_staff_id || currentUserId,
          messages: updatedMsgs,
        };
      });

      // 4. Nếu đang ở tab 'Chờ hỗ trợ' hoặc 'Đã đóng', chuyển mượt mà sang tab 'Đang xử lý'
      if (status === "waiting" || status === "pending" || status === "closed") {
        setStatus("processing");
      }

      // 5. Tham gia phòng socket và tải lại thông tin chi tiết đầy đủ
      if (socketRef.current) {
        socketRef.current.emit("conversation:join", selectedId);
      }
      await fetchDetail(selectedId, true);
    } catch (err) {
      console.error("Lỗi khi nhận xử lý cuộc trò chuyện:", err);
      toast.error(
        err?.response?.data?.message ||
          "Không thể nhận xử lý cuộc trò chuyện. Vui lòng thử lại!"
      );
    } finally {
      setAssigning(false);
    }
  };

  // Xử lý đóng hội thoại với xác nhận Swal và thông báo
  const handleClose = async () => {
    if (!selectedId || closing) return;

    const currentCustomerName =
      detailData?.customer_name ||
      detailData?.customer?.full_name ||
      selected?.customer_name ||
      "khách hàng";

    const confirmation = await Swal.fire({
      title: "Đóng cuộc trò chuyện?",
      text: `Bạn có chắc chắn muốn kết thúc và đóng cuộc trò chuyện với "${currentCustomerName}" (Mã: #${selectedId})?`,
      showCancelButton: true,
      confirmButtonText: "Đóng hội thoại",
      cancelButtonText: "Hủy",
      reverseButtons: true,
      focusCancel: true,
      buttonsStyling: false,
      customClass: {
        popup: "se-swal-popup",
        title: "se-swal-title",
        htmlContainer: "se-swal-text",
        confirmButton: "se-btn-confirm se-btn-danger",
        cancelButton: "se-btn-cancel",
        actions: "se-swal-actions",
      },
    });

    if (!confirmation.isConfirmed) return;

    setClosing(true);
    try {
      const res = await closeConversation(selectedId);
      toast.success(res?.data?.message || "Đã đóng cuộc trò chuyện thành công!");

      const prevStatus = (detailData?.status || selected?.status || "").toLowerCase();
      const isFromWaiting = prevStatus === "waiting" || prevStatus === "pending";

      setConversations((prev) =>
        prev.map((item) =>
          String(item.conversation_id) === String(selectedId)
            ? { ...item, status: "closed" }
            : item
        )
      );

      setSummary((prev) => ({
        ...prev,
        waitingCount: isFromWaiting
          ? Math.max(0, (prev.waitingCount || 0) - 1)
          : prev.waitingCount,
        processingCount: !isFromWaiting
          ? Math.max(0, (prev.processingCount || 0) - 1)
          : prev.processingCount,
        closedCount: (prev.closedCount || 0) + 1,
      }));

      setDetailData((prev) => (prev ? { ...prev, status: "closed" } : prev));

      if (status === "processing" || status === "waiting" || status === "pending") {
        setStatus("closed");
      }

      await fetchDetail(selectedId, true);
    } catch (err) {
      console.error("Lỗi khi đóng hội thoại:", err);
      toast.error(
        err?.response?.data?.message ||
          "Không thể đóng cuộc trò chuyện. Vui lòng thử lại!"
      );
    } finally {
      setClosing(false);
    }
  };


  // Gửi tin nhắn mới trong khung chat (text hoặc một/nhiều file đính kèm)
  const handleSendMessage = async (data) => {
    const rawFiles = Array.isArray(data?.files) && data.files.length > 0
      ? data.files
      : (data?.file ? [data.file] : []);

    if (!selectedId || (!data?.content && rawFiles.length === 0)) return;
    const content = data?.content ? data.content.trim() : "";

    try {
      let res;
      if (data?.reply_to_message_id) {
        if (rawFiles.length > 0) {
          const formData = new FormData();
          rawFiles.forEach((f) => formData.append("files", f));
          if (content) formData.append("content", content);
          formData.append("reply_to_message_id", data.reply_to_message_id);
          formData.append("conversation_id", selectedId);
          res = await replyMessage(data.reply_to_message_id, formData);
        } else {
          res = await replyMessage(data.reply_to_message_id, {
            content,
            conversation_id: selectedId,
          });
        }
      } else if (rawFiles.length > 0) {
        const formData = new FormData();
        rawFiles.forEach((f) => formData.append("files", f));
        if (content) formData.append("content", content);
        formData.append("conversation_id", selectedId);
        res = await sendAttachmentMessage(formData);
      } else {
        res = await sendTextMessage({
          conversation_id: selectedId,
          content: content,
        });
      }
      const createdMsg = res?.data?.data?.message;

      const newMsg = createdMsg || {
        message_id: Date.now(),
        conversation_id: selectedId,
        sender_id: currentUserId || 1,
        sender_role: currentUser?.role || "admin",
        content: content || (data.file ? data.file.name : ""),
        reply_to_message_id: data?.reply_to_message_id || null,
        created_at: new Date().toISOString(),
        is_read: true,
      };

      setDetailData((prev) => ({
        ...prev,
        messages: [
          ...(prev?.messages || []).filter((m) => m.message_id !== newMsg.message_id),
          newMsg,
        ],
      }));

      const previewText =
        newMsg.message_type === "image"
          ? "[Hình ảnh]"
          : newMsg.message_type === "video"
          ? "[Video]"
          : newMsg.attachments?.[0]
          ? `[Tệp] ${newMsg.attachments[0].file_name || ""}`
          : content || "Tin nhắn";

      setConversations((prev) =>
        prev.map((item) =>
          String(item.conversation_id) === String(selectedId)
            ? {
                ...item,
                last_message: previewText,
                last_message_at: newMsg.created_at,
              }
            : item
        )
      );
    } catch (err) {
      console.error("Lỗi khi gửi tin nhắn admin:", err);
      toast.error(err?.response?.data?.message || "Không thể gửi tin nhắn!");
      throw err;
    }
  };

  // Thả / Đổi / Gỡ biểu cảm tin nhắn (Reaction)
  const handleReactToMessage = async (messageId, reactionEmoji) => {
    if (!messageId || !reactionEmoji) return;
    const currentIdStr = String(currentUserId || 1);
    const prevMessages = detailData?.messages || [];

    // Optimistic Update: cập nhật phản ứng tức thì trên giao diện
    setDetailData((prev) => {
      if (!prev || !prev.messages) return prev;
      return {
        ...prev,
        messages: prev.messages.map((m) => {
          if (String(m.message_id) !== String(messageId)) return m;

          const currentReactions = Array.isArray(m.reactions) ? [...m.reactions] : [];
          const existingIdx = currentReactions.findIndex(
            (r) => String(r.account_id) === currentIdStr
          );

          if (existingIdx >= 0) {
            if (currentReactions[existingIdx].reaction === reactionEmoji) {
              // Bấm lại đúng biểu cảm -> Gỡ bỏ (toggle off)
              currentReactions.splice(existingIdx, 1);
            } else {
              // Chọn biểu cảm khác -> Cập nhật sang icon mới
              currentReactions[existingIdx] = {
                ...currentReactions[existingIdx],
                reaction: reactionEmoji,
              };
            }
          } else {
            // Thêm mới biểu cảm
            currentReactions.push({
              reaction_id: `temp-${Date.now()}`,
              message_id: messageId,
              account_id: currentIdStr,
              reaction: reactionEmoji,
              created_at: new Date().toISOString(),
            });
          }

          // Tính lại tổng số lượng biểu cảm
          const counts = {};
          currentReactions.forEach((r) => {
            if (r.reaction) counts[r.reaction] = (counts[r.reaction] || 0) + 1;
          });

          return {
            ...m,
            reactions: currentReactions,
            reaction_summary: {
              total: currentReactions.length,
              ...counts,
            },
          };
        }),
      };
    });

    try {
      const res = await reactToMessage(messageId, reactionEmoji);
      const resData = res?.data?.data;
      if (resData) {
        setDetailData((prev) => {
          if (!prev || !prev.messages) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) => {
              if (String(m.message_id) === String(messageId)) {
                return {
                  ...m,
                  reactions: resData.reactions || m.reactions,
                  reaction_summary: resData.summary || m.reaction_summary,
                };
              }
              return m;
            }),
          };
        });
      }
    } catch (err) {
      console.error("Lỗi khi thả biểu cảm:", err);
      // Revert lại dữ liệu cũ nếu lỗi
      setDetailData((prev) => (prev ? { ...prev, messages: prevMessages } : prev));
      toast.error(err?.response?.data?.message || "Không thể thả biểu cảm tin nhắn!");
    }
  };

  // Gỡ biểu cảm của chính mình
  const handleRemoveReaction = async (messageId) => {
    if (!messageId) return;
    const currentIdStr = String(currentUserId || 1);
    const prevMessages = detailData?.messages || [];

    setDetailData((prev) => {
      if (!prev || !prev.messages) return prev;
      return {
        ...prev,
        messages: prev.messages.map((m) => {
          if (String(m.message_id) !== String(messageId)) return m;
          const currentReactions = (m.reactions || []).filter(
            (r) => String(r.account_id) !== currentIdStr
          );
          const counts = {};
          currentReactions.forEach((r) => {
            if (r.reaction) counts[r.reaction] = (counts[r.reaction] || 0) + 1;
          });
          return {
            ...m,
            reactions: currentReactions,
            reaction_summary: {
              total: currentReactions.length,
              ...counts,
            },
          };
        }),
      };
    });

    try {
      const res = await removeReaction(messageId);
      const resData = res?.data?.data;
      if (resData) {
        setDetailData((prev) => {
          if (!prev || !prev.messages) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) => {
              if (String(m.message_id) === String(messageId)) {
                return {
                  ...m,
                  reactions: resData.reactions || m.reactions,
                  reaction_summary: resData.summary || m.reaction_summary,
                };
              }
              return m;
            }),
          };
        });
      }
    } catch (err) {
      console.error("Lỗi khi gỡ biểu cảm:", err);
      setDetailData((prev) => (prev ? { ...prev, messages: prevMessages } : prev));
      toast.error(err?.response?.data?.message || "Không thể gỡ biểu cảm!");
    }
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
        setDetailData((prev) => {
          if (!prev) return prev;
          const prevMsgs = prev.messages || [];
          const newMsgs = newData.messages || [];
          const map = new Map();
          newMsgs.forEach((m) => {
            if (m.message_id) map.set(String(m.message_id), m);
          });
          prevMsgs.forEach((m) => {
            if (m.message_id) map.set(String(m.message_id), m);
          });
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
          );
          return {
            ...prev,
            messages: merged,
            pagination: newData.pagination,
          };
        });
      }
    } catch (err) {
      console.error("Lỗi khi tải thêm tin nhắn cũ:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Tự động tải tiếp tin nhắn cũ hơn và cuộn đến tin nhắn gốc khi bấm vào trích dẫn reply
  const handleJumpToMessage = useCallback(
    async (targetMessageId) => {
      if (!targetMessageId) return;

      // 1. Nếu tin nhắn đã hiển thị sẵn trong DOM, cuộn mượt và highlight ngay lập tức
      const existingEl = document.getElementById(`msg-${targetMessageId}`);
      if (existingEl) {
        existingEl.scrollIntoView({ behavior: "smooth", block: "center" });
        const bubble = existingEl.querySelector(".support-bubble");
        if (bubble) {
          bubble.classList.add("support-bubble-highlight");
          setTimeout(() => bubble.classList.remove("support-bubble-highlight"), 1800);
        }
        return;
      }

      // 2. Nếu tin nhắn đã có sẵn trong state messages nhưng vừa mới render vào DOM
      const currentDetail = detailDataRef.current;
      const currentMessages = currentDetail?.messages || [];
      const isAlreadyInState = currentMessages.some(
        (m) => String(m.message_id) === String(targetMessageId)
      );

      if (isAlreadyInState) {
        let retries = 0;
        const tryScroll = () => {
          const el = document.getElementById(`msg-${targetMessageId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            const bubble = el.querySelector(".support-bubble");
            if (bubble) {
              bubble.classList.add("support-bubble-highlight");
              setTimeout(() => bubble.classList.remove("support-bubble-highlight"), 1800);
            }
          } else if (retries < 8) {
            retries += 1;
            setTimeout(tryScroll, 60);
          }
        };
        tryScroll();
        return;
      }

      // 3. Nếu đang có một tiến trình tìm/tải tin nhắn khác, tránh gọi lặp lại
      if (jumpingRef.current) return;

      const currentConvId = selectedIdRef.current;
      if (!currentConvId) return;

      let hasMore = currentDetail?.pagination?.has_more !== false;
      let cursor =
        currentDetail?.pagination?.next_cursor || currentMessages[0]?.created_at;

      // Nếu không còn tin nhắn cũ hơn để tải
      if (!hasMore) {
        toast.info("Không tìm thấy tin nhắn gốc trong lịch sử cuộc trò chuyện.");
        return;
      }

      jumpingRef.current = true;
      setLoadingMore(true);

      try {
        let found = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 15; // Tải tối đa 15 đợt (30 tin/đợt = 450 tin)

        while (!found && hasMore && attempts < MAX_ATTEMPTS) {
          attempts += 1;
          const res = await getConversationDetails(currentConvId, {
            before: cursor,
            limit: 30,
          });

          // Nếu người dùng đã chuyển sang cuộc trò chuyện khác trong khi đang tải
          if (String(selectedIdRef.current) !== String(currentConvId)) {
            return;
          }

          const newData = res?.data?.data;
          const batchMessages = newData?.messages || [];

          if (batchMessages.length === 0) {
            hasMore = false;
            break;
          }

          hasMore = Boolean(newData?.pagination?.has_more);
          cursor = newData?.pagination?.next_cursor || batchMessages[0]?.created_at;

          // Cập nhật messages vào detailData ngay đợt này
          setDetailData((prev) => {
            if (!prev || String(prev.conversation_id) !== String(currentConvId)) return prev;
            const prevMsgs = prev.messages || [];
            const map = new Map();
            batchMessages.forEach((m) => {
              if (m.message_id) map.set(String(m.message_id), m);
            });
            prevMsgs.forEach((m) => {
              if (m.message_id) map.set(String(m.message_id), m);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
            );
            return {
              ...prev,
              messages: merged,
              pagination: {
                ...(prev.pagination || {}),
                has_more: hasMore,
                next_cursor: cursor,
              },
            };
          });

          // Kiểm tra xem tin nhắn cần tìm đã xuất hiện trong batch mới tải chưa
          if (batchMessages.some((m) => String(m.message_id) === String(targetMessageId))) {
            found = true;
            break;
          }
        }

        if (found) {
          let retryCount = 0;
          const tryScroll = () => {
            const el = document.getElementById(`msg-${targetMessageId}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              const bubble = el.querySelector(".support-bubble");
              if (bubble) {
                bubble.classList.add("support-bubble-highlight");
                setTimeout(() => bubble.classList.remove("support-bubble-highlight"), 1800);
              }
            } else if (retryCount < 10) {
              retryCount += 1;
              setTimeout(tryScroll, 60);
            }
          };
          setTimeout(tryScroll, 80);
        } else {
          toast.info("Không tìm thấy tin nhắn gốc trong lịch sử cuộc trò chuyện.");
        }
      } catch (err) {
        console.error("Lỗi khi tự động tải tin nhắn cũ:", err);
        toast.error("Không thể tải tin nhắn cũ. Vui lòng thử lại!");
      } finally {
        jumpingRef.current = false;
        setLoadingMore(false);
      }
    },
    []
  );
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
                <EmptyState text="Không có cuộc trò chuyện nào để hiển thị" />
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
                  {(isPending || isClosed) && (
                    <button
                      type="button"
                      className="btn btn-dark btn-sm d-inline-flex align-items-center gap-1"
                      onClick={handleAssign}
                      disabled={assigning || closing}
                    >
                      {assigning && (
                        <span className="spinner-border spinner-border-sm me-1" role="status" />
                      )}
                      <span>{assigning ? "Đang xử lý..." : "Nhận xử lý"}</span>
                    </button>
                  )}
                  {!isClosed && !isPending && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1"
                      onClick={handleClose}
                      disabled={closing}
                      title="Kết thúc và đóng cuộc trò chuyện này"
                    >
                      {closing ? (
                        <span className="spinner-border spinner-border-sm me-1" role="status" />
                      ) : (
                        <i className="bi bi-check2-circle" />
                      )}
                      <span>{closing ? "Đang đóng..." : "Đóng hội thoại"}</span>
                    </button>
                  )}
                </div>
              </div>

              <ChatPanel
                key={selected.conversation_id}
                conversation={selected}
                customerName={
                  detailData?.customer_name ||
                  detailData?.customer?.full_name ||
                  selected.customer_name ||
                  "Khách hàng"
                }
                user={currentUser}
                messages={detailData?.messages || []}
                loading={detailLoading}
                error={detailError}
                pagination={detailData?.pagination}
                loadingMore={loadingMore}
                onLoadMore={handleLoadMore}
                onJumpToMessage={handleJumpToMessage}
                onSend={handleSendMessage}
                onAssign={handleAssign}
                assigning={assigning}
                onClose={handleClose}
                closing={closing}
                canShowMessages={canShowMessages}
                canSendMessage={canSendMessage}
                isPending={isPending}
                isProcessing={isProcessing}
                isClosed={isClosed}
                isAssignedToMe={isAssignedToMe}
                onReact={handleReactToMessage}
                onRemoveReaction={handleRemoveReaction}
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

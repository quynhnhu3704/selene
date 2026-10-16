import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { sendMessageToBot } from "../../services/chatbot.service";
import {
  getMyMessages,
  sendTextMessage,
  sendAttachmentMessage,
  replyMessage,
  reactToMessage,
  removeReaction,
} from "../../services/chat.service";
import { createChatSocket } from "../../socket/chat.socket";
import { getUser, isLoggedIn } from "../../utils/auth";
import {
  ReactionPicker,
  ReactionBadge,
  ReactionDetailModal,
} from "../SupportChat/MessageReaction";
import "../SupportChat/support.css";
import { toast } from "react-toastify";
import defaultProduct from "../../assets/images/default-product.png";

import BOT_AVATAR from "../../assets/images/default-chatbot.png";
import CHATBOT_ICON from "../../assets/images/chatbot.png";

// Helper định dạng kích thước tệp tin (KB, MB)
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "";
  const num = Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

// Trích xuất thông tin media từ tin nhắn (ảnh, video, file, audio, danh sách attachments)
function resolveMedia(message) {
  let fileUrl = message.file_url || null;
  let fileName = message.file_name || null;
  let fileSize = message.file_size || null;
  let fileType = message.file_type || null;
  let messageType = message.message_type || "text";
  let caption = message.content || message.text || "";

  let attachmentsList = Array.isArray(message.attachments) ? message.attachments : [];

  if (attachmentsList.length > 0) {
    const firstAtt = attachmentsList[0];
    fileUrl = fileUrl || firstAtt.file_url;
    fileName = fileName || firstAtt.file_name;
    fileSize = fileSize || firstAtt.file_size;
    fileType = fileType || firstAtt.file_type;
  }

  if (typeof caption === "string" && caption.startsWith("{")) {
    try {
      const parsed = JSON.parse(caption);
      if (parsed.file_url || parsed.url) {
        fileUrl = parsed.file_url || parsed.url;
        fileName = parsed.file_name || parsed.name || fileName;
        fileSize = parsed.file_size || parsed.size || fileSize;
        fileType = parsed.file_type || parsed.type || fileType;
        if (parsed.type) messageType = parsed.type;
        caption = parsed.text || parsed.caption || "";
      }
    } catch {
      // Giữ nguyên caption
    }
  }

  if (!fileUrl && typeof caption === "string" && caption.startsWith("http")) {
    fileUrl = caption;
  }

  if (fileUrl) {
    const ext = (fileName || fileUrl).split(".").pop()?.split("?")[0]?.toLowerCase();
    const mime = (fileType || "").toLowerCase();

    if (
      messageType === "image" ||
      mime.startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "heic", "avif"].includes(ext)
    ) {
      messageType = "image";
    } else if (
      messageType === "video" ||
      mime.startsWith("video/") ||
      ["mp4", "webm", "mov", "mkv", "avi"].includes(ext)
    ) {
      messageType = "video";
    } else if (
      messageType === "audio" ||
      mime.startsWith("audio/") ||
      ["mp3", "wav", "ogg", "m4a"].includes(ext)
    ) {
      messageType = "audio";
    } else if (messageType !== "image" && messageType !== "video") {
      messageType = "file";
    }
  }

  const isCaptionRedundant =
    caption === fileName ||
    caption === fileUrl ||
    caption === "[Hình ảnh]" ||
    caption === "[Video]" ||
    caption === "[Tệp đính kèm]" ||
    /^\[\d+\s+(hình ảnh|video|ghi âm|tệp đính kèm)\]$/i.test(caption.trim());

  const displayCaption = isCaptionRedundant ? "" : caption;

  return { fileUrl, fileName, fileSize, fileType, messageType, displayCaption, attachmentsList };
}

// Giữ giao diện chat mẫu, nhận văn bản, tệp tin và sản phẩm riêng từ API của Selene.
function Chatbot() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [conversationStatus, setConversationStatus] = useState("open");
  const [conversationId, setConversationId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null);

  // Biểu cảm tin nhắn (Reaction)
  const [activePickerMessageId, setActivePickerMessageId] = useState(null);
  const [detailModalMessageId, setDetailModalMessageId] = useState(null);

  const currentUser = getUser();
  const currentAccountId = currentUser?.accountId || currentUser?.account_id || currentUser?.id;

  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const shouldScrollToBottomRef = useRef(false);
  const sendingRef = useRef(false);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);
  const conversationIdRef = useRef(null);
  const openRef = useRef(open);

  // Tự động focus ô nhập khi người dùng bấm reply
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  // Trích xuất text xem trước của tin nhắn reply
  const getReplyPreview = (msg) => {
    if (!msg) return "";
    if (msg.message_type === "image") {
      return msg.content && msg.content !== "[Hình ảnh]" ? `[Hình ảnh] ${msg.content}` : "[Hình ảnh]";
    }
    if (msg.message_type === "video") {
      return msg.content && msg.content !== "[Video]" ? `[Video] ${msg.content}` : "[Video]";
    }
    if (msg.message_type === "audio") return "[Âm thanh]";
    if (msg.attachments && msg.attachments.length > 0) {
      return `[Tệp đính kèm] ${msg.attachments[0].file_name || ""}`;
    }
    return msg.content || msg.text || "Tin nhắn";
  };

  // Xác định tên người gửi của tin nhắn được reply
  const getReplySenderName = (replyObj) => {
    if (!replyObj) return "Tin nhắn";
    if (replyObj.sender_role === "customer" || replyObj.role === "user") {
      return "Bạn";
    }
    if (replyObj.sender_role === "staff" || replyObj.sender_role === "admin") {
      return "Nhân viên hỗ trợ";
    }
    return "Selene AI";
  };

  // Xử lý sự kiện cuộn tin nhắn để xác định vị trí của người dùng
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceToBottom <= 80;
    isAtBottomRef.current = atBottom;
    setShowScrollBottom(distanceToBottom > 120);
  };

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = (behavior = "smooth") => {
    isAtBottomRef.current = true;
    setShowScrollBottom(false);
    messagesEndRef.current?.scrollIntoView({
      behavior,
      block: "nearest",
    });
  };

  // Cuộn mượt đến tin nhắn gốc khi bấm vào trích dẫn reply
  const scrollToMessage = async (targetMessageId) => {
    if (!targetMessageId) return;
    shouldScrollToBottomRef.current = false;
    isAtBottomRef.current = false;
    const element = document.getElementById(`chatbot-msg-${targetMessageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      const bubble = element.querySelector(".bubble");
      if (bubble) {
        bubble.classList.add("chatbot-bubble-highlight");
        setTimeout(() => {
          bubble.classList.remove("chatbot-bubble-highlight");
        }, 1800);
      }
      return;
    }

    // Nếu tin nhắn nằm ở phần cũ hơn chưa tải
    if (pagination?.has_more !== false && !loadingMore) {
      setLoadingMore(true);
      try {
        let found = false;
        let cursor = pagination?.next_cursor || pagination?.oldest_message_id;
        let hasMore = true;
        let attempts = 0;

        while (!found && hasMore && attempts < 10) {
          attempts += 1;
          const res = await getMyMessages({ before: cursor, limit: 25 });
          const data = res?.data?.data;
          const batch = data?.messages || [];
          if (!batch.length) break;

          hasMore = Boolean(data?.pagination?.has_more);
          cursor = data?.pagination?.next_cursor || data?.pagination?.oldest_message_id;

          setMessages((prev) => {
            const map = new Map();
            batch.forEach((m) => {
              if (m.message_id) map.set(String(m.message_id), m);
            });
            (prev || []).forEach((m) => {
              if (m.message_id) map.set(String(m.message_id), m);
            });
            return Array.from(map.values()).sort(
              (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
            );
          });
          setPagination(data?.pagination || null);

          if (batch.some((m) => String(m.message_id) === String(targetMessageId))) {
            found = true;
            break;
          }
        }

        if (found) {
          let retry = 0;
          const scroll = () => {
            const el = document.getElementById(`chatbot-msg-${targetMessageId}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              const bubble = el.querySelector(".bubble");
              if (bubble) {
                bubble.classList.add("chatbot-bubble-highlight");
                setTimeout(() => bubble.classList.remove("chatbot-bubble-highlight"), 1800);
              }
            } else if (retry < 10) {
              retry += 1;
              setTimeout(scroll, 60);
            }
          };
          setTimeout(scroll, 80);
        }
      } catch (err) {
        console.error("Lỗi khi tải tin nhắn cũ trong chatbot:", err);
      } finally {
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
    if (socketRef.current && conversationId) {
      socketRef.current.emit("conversation:join", conversationId);
    }
  }, [conversationId]);

  // Chỉ tự động cuộn xuống đáy khi có yêu cầu (mới gửi tin nhắn hoặc người dùng đang ở đáy)
  useEffect(() => {
    if (shouldScrollToBottomRef.current || isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      shouldScrollToBottomRef.current = false;
    }
  }, [messages, isSending]);

  // Chọn tệp đính kèm (hỗ trợ nhiều ảnh, video, tệp tin cùng lúc)
  const handleFileChange = (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (!rawFiles.length) return;

    const validFiles = [];
    const newPreviews = [];

    for (const file of rawFiles) {
      if (file.size > 50 * 1024 * 1024) {
        alert(`Tệp "${file.name}" vượt quá dung lượng cho phép (50MB)!`);
        continue;
      }
      validFiles.push(file);
      const isImg = file.type.startsWith("image/");
      const isVid = file.type.startsWith("video/");
      const isAud = file.type.startsWith("audio/");
      newPreviews.push({
        file,
        previewUrl: isImg ? URL.createObjectURL(file) : null,
        name: file.name,
        size: file.size,
        type: file.type,
        isImage: isImg,
        isVideo: isVid,
        isAudio: isAud,
      });
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setFilePreviews((prev) => [...prev, ...newPreviews]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Hủy một tệp tin đã chọn
  const removeSelectedFileAt = (index) => {
    setFilePreviews((prev) => {
      const target = prev[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Hủy toàn bộ tệp tin đã chọn
  const clearAllSelectedFiles = () => {
    filePreviews.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setFilePreviews([]);
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
        if (data.conversation_id) {
          setConversationId(data.conversation_id);
          conversationIdRef.current = data.conversation_id;
          if (socketRef.current) {
            socketRef.current.emit("conversation:join", data.conversation_id);
          }
        }
        if (Array.isArray(data.messages)) {
          setMessages((prev) => {
            if (prev.length === 0) {
              shouldScrollToBottomRef.current = true;
              return data.messages;
            }

            // Kiểm tra xem có tin nhắn mới nào chưa tồn tại trong danh sách không
            const prevIds = new Set(prev.map((m) => String(m.message_id)));
            const hasNewMessages = data.messages.some(
              (m) => m.message_id && !prevIds.has(String(m.message_id))
            );

            // Kiểm tra xem có tin nhắn nào bị chỉnh sửa nội dung/trạng thái/biểu cảm không
            let hasModified = false;
            if (!hasNewMessages) {
              const prevMap = new Map(prev.map((m) => [String(m.message_id), m]));
              for (const m of data.messages) {
                if (!m.message_id) continue;
                const existing = prevMap.get(String(m.message_id));
                if (
                  existing &&
                  (existing.content !== m.content ||
                    existing.status !== m.status ||
                    existing.message_type !== m.message_type ||
                    existing.reply_to?.message_id !== m.reply_to?.message_id ||
                    Number(existing.reaction_summary?.total || 0) !== Number(m.reaction_summary?.total || 0) ||
                    (existing.reactions || []).length !== (m.reactions || []).length ||
                    JSON.stringify(existing.reactions || []) !== JSON.stringify(m.reactions || []))
                ) {
                  hasModified = true;
                  break;
                }
              }
            }

            // Nếu không có tin nhắn mới và không có thay đổi -> giữ nguyên prev để tránh re-render và tránh cuộn
            if (!hasNewMessages && !hasModified) {
              return prev;
            }

            // Chỉ cho phép tự động cuộn nếu có tin nhắn mới VÀ người dùng đang ở đáy
            if (hasNewMessages && isAtBottomRef.current) {
              shouldScrollToBottomRef.current = true;
            }

            const map = new Map();
            prev.forEach((m) => {
              if (m.message_id) map.set(String(m.message_id), m);
            });
            data.messages.forEach((m) => {
              if (m.message_id) map.set(String(m.message_id), m);
            });
            return Array.from(map.values()).sort(
              (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
            );
          });
        }
      }
    } catch (err) {
      console.warn("Chưa thể tải lịch sử tin nhắn:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Khi mở cửa sổ chat, tự động tải tin nhắn từ API getMyMessages và cuộn xuống đáy
  useEffect(() => {
    if (open) {
      setUnreadCount(0);
      isAtBottomRef.current = true;
      shouldScrollToBottomRef.current = true;
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "auto",
          block: "nearest",
        });
      }, 50);
      fetchHistory(false);
    }
  }, [open, fetchHistory]);

  // Tự động tải lại tin nhắn định kỳ mỗi 3.5s khi đang mở khung chat để nhận ngay tin nhắn mới từ admin
  useEffect(() => {
    if (!open || !isLoggedIn()) return;
    const interval = setInterval(() => {
      fetchHistory(true);
    }, 3500);
    return () => clearInterval(interval);
  }, [open, fetchHistory]);

  // Lắng nghe cập nhật realtime qua Socket.IO
  useEffect(() => {
    if (!isLoggedIn()) return;
    let socket = null;
    try {
      socket = createChatSocket();
      socketRef.current = socket;
      if (socket) {
        if (conversationIdRef.current) {
          socket.emit("conversation:join", conversationIdRef.current);
        }

        socket.on("connect", () => {
          if (conversationIdRef.current) {
            socket.emit("conversation:join", conversationIdRef.current);
          }
        });

        // Nhận tin nhắn mới từ admin / nhân viên theo thời gian thực
        socket.on("message:new", (newMsg) => {
          if (!newMsg) return;
          setMessages((prev) => {
            if (prev.some((m) => String(m.message_id) === String(newMsg.message_id))) {
              return prev;
            }
            if (isAtBottomRef.current) {
              shouldScrollToBottomRef.current = true;
            }
            return [...prev, newMsg];
          });

          // Tăng huy hiệu tin nhắn mới nếu đang đóng cửa sổ chat
          if (
            !openRef.current &&
            (newMsg.sender_role === "staff" || newMsg.sender_role === "admin")
          ) {
            setUnreadCount((c) => c + 1);
          }
        });

        // Cập nhật trạng thái hội thoại hoặc khi có tin nhắn mới từ admin
        socket.on("conversation:update", (payload) => {
          if (payload?.conversation_id) {
            conversationIdRef.current = payload.conversation_id;
            setConversationId(payload.conversation_id);
            socket.emit("conversation:join", payload.conversation_id);
          }
          fetchHistory(true);
        });

        // Nhận sự kiện reaction tin nhắn realtime
        socket.on("message:reaction", (payload) => {
          if (!payload?.message_id) return;
          setMessages((prev) => {
            if (!prev) return prev;
            let found = false;
            const updated = prev.map((m) => {
              if (String(m.message_id) === String(payload.message_id)) {
                found = true;
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
            });
            return found ? updated : prev;
          });
        });
      }
    } catch (err) {
      console.warn("Lỗi socket chatbot:", err);
    }

    return () => {
      if (socket) {
        socket.off("connect");
        socket.off("message:new");
        socket.off("conversation:update");
        socket.off("message:reaction");
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [fetchHistory]);

  // Tải thêm tin nhắn cũ hơn
  const handleLoadMore = async () => {
    const cursor = pagination?.next_cursor || pagination?.oldest_message_id;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    shouldScrollToBottomRef.current = false;
    isAtBottomRef.current = false;

    const container = messagesContainerRef.current;
    const oldScrollHeight = container ? container.scrollHeight : 0;
    const oldScrollTop = container ? container.scrollTop : 0;

    try {
      const res = await getMyMessages({ before: cursor, limit: 10 });
      const data = res?.data?.data;
      if (data?.messages) {
        setMessages((prev) => [...data.messages, ...prev]);
        setPagination(data.pagination || null);

        // Giữ nguyên vị trí cuộn thị giác sau khi tải thêm tin cũ vào đầu danh sách
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
          }
        });
      }
    } catch (err) {
      console.error("Lỗi khi tải thêm tin nhắn cũ:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Thả / Đổi / Gỡ biểu cảm tin nhắn (Reaction)
  const handleReactToMessage = async (messageId, reactionEmoji) => {
    if (!messageId || !reactionEmoji) return;
    const currentIdStr = String(currentAccountId || "");
    const prevMessages = messages;

    // Optimistic Update
    setMessages((prev) => {
      if (!prev) return prev;
      return prev.map((m) => {
        if (String(m.message_id) !== String(messageId)) return m;

        const currentReactions = Array.isArray(m.reactions) ? [...m.reactions] : [];
        const existingIdx = currentReactions.findIndex(
          (r) => String(r.account_id) === currentIdStr
        );

        if (existingIdx >= 0) {
          if (currentReactions[existingIdx].reaction === reactionEmoji) {
            currentReactions.splice(existingIdx, 1);
          } else {
            currentReactions[existingIdx] = {
              ...currentReactions[existingIdx],
              reaction: reactionEmoji,
            };
          }
        } else {
          currentReactions.push({
            reaction_id: `temp-${Date.now()}`,
            message_id: messageId,
            account_id: currentIdStr,
            reaction: reactionEmoji,
            created_at: new Date().toISOString(),
          });
        }

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
      });
    });

    try {
      const res = await reactToMessage(messageId, reactionEmoji);
      const resData = res?.data?.data;
      if (resData) {
        setMessages((prev) => {
          if (!prev) return prev;
          return prev.map((m) => {
            if (String(m.message_id) === String(messageId)) {
              return {
                ...m,
                reactions: resData.reactions || m.reactions,
                reaction_summary: resData.summary || m.reaction_summary,
              };
            }
            return m;
          });
        });
      }
    } catch (err) {
      console.error("Lỗi khi thả biểu cảm:", err);
      setMessages(prevMessages);
      toast.error(err?.response?.data?.message || "Không thể thả biểu cảm tin nhắn!");
    }
  };

  const handleRemoveReaction = async (messageId) => {
    if (!messageId) return;
    const currentIdStr = String(currentAccountId || "");
    const prevMessages = messages;

    setMessages((prev) => {
      if (!prev) return prev;
      return prev.map((m) => {
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
      });
    });

    try {
      const res = await removeReaction(messageId);
      const resData = res?.data?.data;
      if (resData) {
        setMessages((prev) => {
          if (!prev) return prev;
          return prev.map((m) => {
            if (String(m.message_id) === String(messageId)) {
              return {
                ...m,
                reactions: resData.reactions || m.reactions,
                reaction_summary: resData.summary || m.reaction_summary,
              };
            }
            return m;
          });
        });
      }
    } catch (err) {
      console.error("Lỗi khi gỡ biểu cảm:", err);
      setMessages(prevMessages);
      toast.error(err?.response?.data?.message || "Không thể gỡ biểu cảm!");
    }
  };

  // Gửi tin nhắn loại text hoặc đính kèm nhiều tệp tin (ảnh/video/file) vào CSKH, có hỗ trợ reply
  const send = async () => {
    if ((!message.trim() && selectedFiles.length === 0) || sendingRef.current) return;
    const text = message.trim();
    const filesToSend = [...selectedFiles];
    const previewsToSend = [...filePreviews];
    const replying = replyingTo;

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

    const tempId = "client-" + Date.now();
    const hasFiles = filesToSend.length > 0;
    const firstPreview = previewsToSend[0];

    const optimisticMsg = {
      message_id: tempId,
      role: "user",
      sender_role: "customer",
      content: text || (hasFiles ? (filesToSend.length === 1 ? filesToSend[0].name : `[${filesToSend.length} tệp đính kèm]`) : ""),
      file_url: firstPreview?.previewUrl || null,
      file_name: firstPreview?.name || null,
      file_size: firstPreview?.size || null,
      file_type: firstPreview?.type || null,
      message_type: hasFiles
        ? filesToSend.length > 1
          ? "attachment"
          : firstPreview?.isImage
          ? "image"
          : firstPreview?.isVideo
          ? "video"
          : "file"
        : "text",
      attachments: previewsToSend.map((p, idx) => ({
        attachment_id: `temp-att-${idx}-${Date.now()}`,
        file_url: p.previewUrl || "",
        file_name: p.name,
        file_size: p.size,
        file_type: p.type,
      })),
      reply_to_message_id: replying?.message_id || null,
      reply_to: replying || null,
      created_at: new Date().toISOString(),
    };

    sendingRef.current = true;
    shouldScrollToBottomRef.current = true;
    isAtBottomRef.current = true;
    setShowScrollBottom(false);
    setMessages((prev) => [...prev, optimisticMsg]);
    setMessage("");
    setReplyingTo(null);
    clearAllSelectedFiles();
    setIsSending(true);

    try {
      let res;
      if (replying?.message_id) {
        if (hasFiles) {
          const formData = new FormData();
          filesToSend.forEach((f) => formData.append("files", f));
          if (text) formData.append("content", text);
          formData.append("reply_to_message_id", replying.message_id);
          if (conversationIdRef.current) {
            formData.append("conversation_id", conversationIdRef.current);
          }
          res = await replyMessage(replying.message_id, formData);
        } else {
          res = await replyMessage(replying.message_id, {
            content: text,
            conversation_id: conversationIdRef.current || undefined,
          });
        }
      } else if (hasFiles) {
        const formData = new FormData();
        filesToSend.forEach((f) => formData.append("files", f));
        if (text) formData.append("content", text);
        if (conversationIdRef.current) {
          formData.append("conversation_id", conversationIdRef.current);
        }
        res = await sendAttachmentMessage(formData);
      } else {
        res = await sendTextMessage({
          content: text,
          conversation_id: conversationIdRef.current || undefined,
        });
      }

      const resData = res?.data?.data;
      if (resData?.message) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.message_id !== tempId);
          if (filtered.some((m) => String(m.message_id) === String(resData.message.message_id))) {
            return filtered;
          }
          return [...filtered, resData.message];
        });
      }

      if (resData?.conversation?.conversation_id) {
        const newConvId = resData.conversation.conversation_id;
        setConversationId(newConvId);
        conversationIdRef.current = newConvId;
        if (socketRef.current) {
          socketRef.current.emit("conversation:join", newConvId);
        }
      }

      if (resData?.conversation?.status) {
        setConversationStatus(resData.conversation.status);
      }
    } catch (err) {
      console.error("Lỗi khi gửi tin nhắn:", err);
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.message_id !== tempId);
        return [
          ...filtered,
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
        ];
      });
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
          {open ? (
            <i className="bi bi-x"></i>
          ) : (
            <img src={CHATBOT_ICON} alt="" />
          )}
        </span>
        {unreadCount > 0 && !open && (
          <span className="fab-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
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
            ref={messagesContainerRef}
            onScroll={handleScroll}
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
              const isStaff = msg.sender_role === "staff" || msg.sender_role === "admin";
              const { fileUrl, fileName, fileSize, messageType, displayCaption, attachmentsList } = resolveMedia(msg);
              const textContent = displayCaption || msg.content || msg.text || "";
              const timeString = msg.created_at
                ? new Date(msg.created_at).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              const hasReactions =
                Boolean(msg.reaction_summary?.total > 0) ||
                Boolean(Array.isArray(msg.reactions) && msg.reactions.length > 0);

              const myReaction = Array.isArray(msg.reactions)
                ? msg.reactions.find((r) => String(r.account_id) === String(currentAccountId))
                : null;
              const myReactionEmoji = myReaction?.reaction || null;

              const actionButtons = msg.message_id ? (
                <div className="chatbot-msg-actions">
                  {/* Nút thả biểu cảm (Reaction) */}
                  <button
                    type="button"
                    className={`chatbot-msg-action-btn react-btn${
                      activePickerMessageId === msg.message_id ? " active" : ""
                    }`}
                    title="Bày tỏ cảm xúc"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePickerMessageId((prev) =>
                        prev === msg.message_id ? null : msg.message_id
                      );
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                  </button>

                  {/* Nút trả lời tin nhắn (Reply) */}
                  <button
                    type="button"
                    className="chatbot-msg-action-btn reply-btn"
                    title="Trả lời tin nhắn"
                    onClick={() => setReplyingTo(msg)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#0084ff">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </button>
                </div>
              ) : null;

              return (
                <div
                  id={`chatbot-msg-${msg.message_id}`}
                  key={msg.message_id || index}
                  className={`message-row ${isCustomer ? "user" : "bot"}${
                    hasReactions ? " has-reactions" : ""
                  }`}
                >
                  {isCustomer && actionButtons}
                  {!isCustomer && (
                    <div className="bot-avatar">
                      <img src={BOT_AVATAR} alt="" />
                    </div>
                  )}
                  <div className={`bubble ${isCustomer ? "user" : "bot"}${hasReactions ? " has-reactions" : ""}`}>
                    {/* Thanh chọn biểu cảm nổi bên trên tin nhắn */}
                    {activePickerMessageId === msg.message_id && (
                      <ReactionPicker
                        currentReaction={myReactionEmoji}
                        onSelectReaction={(emoji) => {
                          setActivePickerMessageId(null);
                          handleReactToMessage(msg.message_id, emoji);
                        }}
                        onRemoveReaction={() => {
                          setActivePickerMessageId(null);
                          handleRemoveReaction(msg.message_id);
                        }}
                        onClose={() => setActivePickerMessageId(null)}
                      />
                    )}

                    {/* Trích dẫn tin nhắn reply nếu có */}
                    {msg.reply_to && (
                      <div
                        className="chatbot-reply-quote"
                        onClick={() => scrollToMessage(msg.reply_to.message_id)}
                        title="Bấm để cuộn đến tin nhắn gốc"
                      >
                        <div className="chatbot-reply-quote-sender">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="me-1"
                          >
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                          </svg>
                          <span>{getReplySenderName(msg.reply_to)}</span>
                        </div>
                        <div className="chatbot-reply-quote-text">
                          {getReplyPreview(msg.reply_to)}
                        </div>
                      </div>
                    )}

                    {isStaff && (
                      <span className="sender-badge">
                        <i className="bi bi-person-badge me-1" />
                        Nhân viên hỗ trợ
                      </span>
                    )}

                    {/* Hiển thị nhiều attachments nếu tin nhắn có từ 2 tệp đính kèm trở lên */}
                    {attachmentsList && attachmentsList.length > 1 ? (
                      <div className="chatbot-multi-attachments">
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                            maxWidth: "320px",
                            marginTop: "2px",
                            marginBottom: "4px",
                          }}
                        >
                          {attachmentsList.map((att, idx) => {
                            const attUrl = att.file_url;
                            const attName = att.file_name || "file";
                            const attType = (att.file_type || "").toLowerCase();
                            const ext = (attName.split(".").pop() || "").toLowerCase();
                            const isImg =
                              attType.startsWith("image/") ||
                              ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "heic", "avif"].includes(ext);
                            const isVid =
                              attType.startsWith("video/") ||
                              ["mp4", "mov", "webm", "mkv", "avi"].includes(ext);
                            const isAud =
                              attType.startsWith("audio/") ||
                              ["mp3", "wav", "ogg", "m4a"].includes(ext);

                            if (isImg) {
                              return (
                                <a
                                  key={att.attachment_id || idx}
                                  href={attUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`Xem ảnh: ${attName}`}
                                  style={{
                                    borderRadius: "8px",
                                    overflow: "hidden",
                                    border: "1px solid rgba(0,0,0,0.08)",
                                    display: "inline-block",
                                    flex: attachmentsList.length === 2 ? "1 1 calc(50% - 6px)" : "1 1 calc(33.3% - 6px)",
                                    maxWidth: "150px",
                                    minWidth: "85px",
                                  }}
                                >
                                  <img
                                    src={attUrl}
                                    alt={attName}
                                    style={{
                                      width: "100%",
                                      height: "90px",
                                      objectFit: "cover",
                                      display: "block",
                                    }}
                                    loading="lazy"
                                  />
                                </a>
                              );
                            }

                            if (isVid) {
                              return (
                                <div key={att.attachment_id || idx} style={{ width: "100%", maxWidth: "280px", marginBottom: "4px" }}>
                                  <video controls src={attUrl} style={{ width: "100%", borderRadius: "8px", maxHeight: "180px" }} preload="metadata" />
                                </div>
                              );
                            }

                            if (isAud) {
                              return (
                                <div key={att.attachment_id || idx} style={{ width: "100%", maxWidth: "260px", marginBottom: "4px" }}>
                                  <audio controls src={attUrl} style={{ width: "100%" }} />
                                </div>
                              );
                            }

                            return (
                              <div key={att.attachment_id || idx} className="chatbot-file-box" style={{ width: "100%", marginBottom: "4px" }}>
                                <a href={attUrl} target="_blank" rel="noopener noreferrer" download={attName || true} className="chatbot-file-link" title="Bấm để tải về">
                                  <div className="chatbot-file-icon">
                                    <i className="bi bi-file-earmark-arrow-down-fill" />
                                  </div>
                                  <div className="chatbot-file-meta">
                                    <div className="chatbot-file-title" title={attName}>{attName}</div>
                                    {att.file_size && <div className="chatbot-file-size">{formatFileSize(att.file_size)}</div>}
                                  </div>
                                  <i className="bi bi-download chatbot-file-dl-icon" />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                        {displayCaption && <div className="chatbot-media-caption">{displayCaption}</div>}
                      </div>
                    ) : (
                      <>
                        {/* 1. Tin nhắn hình ảnh */}
                        {fileUrl && messageType === "image" && (
                          <div className="chatbot-media-box">
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Bấm để xem ảnh đầy đủ"
                            >
                              <img
                                src={fileUrl}
                                alt={fileName || "Hình ảnh đính kèm"}
                                className="chatbot-img-preview"
                                loading="lazy"
                              />
                            </a>
                            {textContent && (
                              <div className="chatbot-media-caption">{textContent}</div>
                            )}
                          </div>
                        )}

                        {/* 2. Tin nhắn video */}
                        {fileUrl && messageType === "video" && (
                          <div className="chatbot-media-box">
                            <video
                              controls
                              src={fileUrl}
                              className="chatbot-video-preview"
                              preload="metadata"
                            >
                              Trình duyệt không hỗ trợ phát video này.
                            </video>
                            {textContent && (
                              <div className="chatbot-media-caption">{textContent}</div>
                            )}
                          </div>
                        )}

                        {/* 3. Tin nhắn âm thanh */}
                        {fileUrl && messageType === "audio" && (
                          <div className="chatbot-media-box">
                            <audio controls src={fileUrl} className="chatbot-audio-preview" />
                            {textContent && (
                              <div className="chatbot-media-caption">{textContent}</div>
                            )}
                          </div>
                        )}

                        {/* 4. Tin nhắn tệp tin / tài liệu */}
                        {fileUrl && messageType === "file" && (
                          <div className="chatbot-file-box">
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={fileName || true}
                              className="chatbot-file-link"
                              title="Bấm để tải về"
                            >
                              <div className="chatbot-file-icon">
                                <i className="bi bi-file-earmark-arrow-down-fill" />
                              </div>
                              <div className="chatbot-file-meta">
                                <div className="chatbot-file-title" title={fileName || "Tệp tin"}>
                                  {fileName || "Tệp tin đính kèm"}
                                </div>
                                {fileSize && (
                                  <div className="chatbot-file-size">
                                    {formatFileSize(fileSize)}
                                  </div>
                                )}
                              </div>
                              <i className="bi bi-download chatbot-file-dl-icon" />
                            </a>
                            {textContent && (
                              <div className="chatbot-media-caption">{textContent}</div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* 5. Tin nhắn văn bản thuần túy */}
                    {!fileUrl && (!attachmentsList || attachmentsList.length === 0) && (
                      <div className="bubble-content">{textContent}</div>
                    )}

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
                    {/* Huy hiệu tổng hợp cảm xúc gắn ở chân tin nhắn (như ảnh mẫu) */}
                    {hasReactions && (
                      <ReactionBadge
                        messageId={msg.message_id}
                        reactions={msg.reactions}
                        summary={msg.reaction_summary}
                        currentAccountId={currentAccountId}
                        own={isCustomer}
                        onClick={() => setDetailModalMessageId(msg.message_id)}
                      />
                    )}
                  </div>
                  {!isCustomer && actionButtons}
                </div>
              );
            })}

            {/* Modal chi tiết danh sách người thả cảm xúc */}
            {detailModalMessageId && (
              <ReactionDetailModal
                messageId={detailModalMessageId}
                isOpen={Boolean(detailModalMessageId)}
                onClose={() => setDetailModalMessageId(null)}
                currentAccountId={currentAccountId}
                onRemoveMyReaction={(mId) => handleRemoveReaction(mId)}
              />
            )}

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

          {/* Nút nổi cuộn xuống đáy khi người dùng đã kéo lên */}
          {showScrollBottom && (
            <button
              type="button"
              className="chatbot-scroll-bottom-btn"
              onClick={() => scrollToBottom("smooth")}
              title="Cuộn xuống tin mới nhất"
              aria-label="Cuộn xuống tin mới nhất"
            >
              <i className="bi bi-chevron-down" />
            </button>
          )}

          {/* Thanh xem trước danh sách tệp tin trước khi gửi */}
          {filePreviews.length > 0 && (
            <div
              className="chatbot-file-preview-bar"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                maxHeight: "130px",
                overflowY: "auto",
                padding: "8px 12px",
                background: "#f8f9fa",
                borderTop: "1px solid #e9ecef",
              }}
            >
              {filePreviews.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#ffffff",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "12px",
                    maxWidth: "200px",
                  }}
                >
                  {p.previewUrl ? (
                    <img
                      src={p.previewUrl}
                      alt="Preview"
                      style={{
                        width: "28px",
                        height: "28px",
                        objectFit: "cover",
                        borderRadius: "4px",
                      }}
                    />
                  ) : (
                    <i className="bi bi-file-earmark text-primary" style={{ fontSize: "16px" }} />
                  )}
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "110px",
                    }}
                    title={p.name}
                  >
                    {p.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSelectedFileAt(idx)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#dc3545",
                      cursor: "pointer",
                      padding: 0,
                      lineHeight: 1,
                    }}
                    title="Xóa tệp này"
                  >
                    <i className="bi bi-x-circle-fill" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Thanh hiển thị tin nhắn đang được Reply */}
          {replyingTo && (
            <div className="chatbot-reply-banner">
              <div className="chatbot-reply-banner-body">
                <div className="chatbot-reply-banner-title">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="#0084ff"
                    className="me-1"
                    style={{ display: "inline-block", verticalAlign: "-2px" }}
                  >
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                  <span>Trả lời</span>
                </div>
                <div className="chatbot-reply-banner-text" title={getReplyPreview(replyingTo)}>
                  {getReplyPreview(replyingTo)}
                </div>
              </div>
              <button
                type="button"
                className="chatbot-reply-banner-close"
                onClick={() => setReplyingTo(null)}
                title="Hủy trả lời (Esc)"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
          )}

          <div className="chatbot-input-area">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
              disabled={isSending}
              multiple
            />
            <button
              type="button"
              className="attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              title="Đính kèm hình ảnh, video hoặc tệp tin (chọn nhiều tệp)"
              aria-label="Đính kèm tệp"
            >
              <i className="bi bi-paperclip" />
            </button>

            <input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                filePreviews.length > 0
                  ? `Thêm chú thích cho ${filePreviews.length} tệp tin (tùy chọn)...`
                  : replyingTo
                  ? "Trả lời tin nhắn..."
                  : "Hỏi về trang phục, so sánh, giá tốt..."
              }
              aria-label="Tin nhắn cho trợ lý Selene"
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === "Escape" && replyingTo) {
                  setReplyingTo(null);
                } else if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={isSending}
            />
            <button
              type="button"
              className={`send-btn ${(!message.trim() && filePreviews.length === 0) || isSending ? "disabled" : ""}`}
              onClick={send}
              disabled={(!message.trim() && filePreviews.length === 0) || isSending}
              aria-label="Gửi tin nhắn"
            >
              {isSending ? (
                <span className="spinner-border spinner-border-sm" role="status" />
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
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

.selene-chatbot .chatbot-fab .fab-icon img {
  width: 56px;
  height: 56px;
  object-fit: contain;
  vertical-align: middle;
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
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid rgba(135, 27, 27, 0.12);
  display: flex;
  align-items: center;
  gap: 10px;
}

.selene-chatbot .attach-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #fdf6f6;
  border: 1px solid rgba(135, 27, 27, 0.2);
  color: #871b1b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.selene-chatbot .attach-btn:hover:not(:disabled) {
  background: #871b1b;
  color: #fff;
  transform: scale(1.06);
  box-shadow: 0 4px 12px rgba(135, 27, 27, 0.25);
}

.selene-chatbot .attach-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.selene-chatbot .chatbot-file-preview-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: #fdf8f8;
  border-top: 1px solid rgba(135, 27, 27, 0.15);
  font-size: 12.5px;
  animation: selene-fade-in 0.2s ease;
}

@keyframes selene-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.selene-chatbot .chatbot-preview-thumb {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid rgba(135, 27, 27, 0.2);
  flex-shrink: 0;
}

.selene-chatbot .chatbot-preview-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.selene-chatbot .chatbot-preview-name {
  font-weight: 600;
  color: #212529;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12.5px;
}

.selene-chatbot .chatbot-preview-size {
  color: #6c757d;
  font-size: 11px;
}

.selene-chatbot .chatbot-preview-remove {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  font-size: 17px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.selene-chatbot .chatbot-preview-remove:hover {
  color: #dc3545;
}

/* Media preview in chat bubbles */
.selene-chatbot .chatbot-media-box {
  margin-bottom: 4px;
}

.selene-chatbot .chatbot-img-preview {
  max-width: 240px;
  max-height: 240px;
  width: auto;
  height: auto;
  border-radius: 12px;
  object-fit: cover;
  display: block;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
  background: #f0f0f0;
}

.selene-chatbot .chatbot-img-preview:hover {
  transform: scale(1.02);
  opacity: 0.95;
}

.selene-chatbot .chatbot-video-preview {
  max-width: 240px;
  max-height: 200px;
  border-radius: 12px;
  display: block;
  outline: none;
  background: #000;
}

.selene-chatbot .chatbot-audio-preview {
  max-width: 240px;
  display: block;
}

.selene-chatbot .chatbot-file-box {
  min-width: 180px;
  max-width: 240px;
}

.selene-chatbot .chatbot-file-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  text-decoration: none;
  transition: background 0.15s ease;
}

.selene-chatbot .bubble.bot .chatbot-file-link {
  background: rgba(135, 27, 27, 0.06);
  border: 1px solid rgba(135, 27, 27, 0.12);
  color: #212529;
}

.selene-chatbot .bubble.bot .chatbot-file-link:hover {
  background: rgba(135, 27, 27, 0.12);
}

.selene-chatbot .bubble.user .chatbot-file-link {
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
}

.selene-chatbot .bubble.user .chatbot-file-link:hover {
  background: rgba(255, 255, 255, 0.28);
}

.selene-chatbot .chatbot-file-icon {
  font-size: 22px;
  display: flex;
  align-items: center;
}

.selene-chatbot .bubble.bot .chatbot-file-icon {
  color: #871b1b;
}

.selene-chatbot .bubble.user .chatbot-file-icon {
  color: #fff;
}

.selene-chatbot .chatbot-file-meta {
  flex: 1;
  min-width: 0;
}

.selene-chatbot .chatbot-file-title {
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selene-chatbot .chatbot-file-size {
  font-size: 11px;
  opacity: 0.75;
}

.selene-chatbot .chatbot-file-dl-icon {
  font-size: 15px;
  opacity: 0.8;
}

.selene-chatbot .chatbot-media-caption {
  margin-top: 6px;
  font-size: 13.5px;
  line-height: 1.4;
  word-break: break-word;
}

.selene-chatbot .fab-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  background: #e02424;
  color: #fff;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  min-width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  border: 2px solid #fff;
  animation: selene-badge-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes selene-badge-pop {
  from { transform: scale(0); }
  to   { transform: scale(1); }
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

/* Nút hành động Reply khi hover tin nhắn trong chatbot */
.selene-chatbot .chatbot-msg-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease, transform 0.18s ease;
  transform: scale(0.9);
  flex-shrink: 0;
  user-select: none;
}
.selene-chatbot .message-row:hover .chatbot-msg-actions {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
}
.selene-chatbot .chatbot-msg-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #0084ff;
  padding: 0;
  transition: all 0.15s ease;
}
.selene-chatbot .chatbot-msg-action-btn:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12);
}

/* Trích dẫn tin nhắn Reply trong bong bóng chat */
.selene-chatbot .chatbot-reply-quote {
  display: flex;
  flex-direction: column;
  padding: 5px 9px;
  background: rgba(0, 0, 0, 0.06);
  border-left: 3px solid #0084ff;
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s ease;
  text-align: left;
}
.selene-chatbot .chatbot-reply-quote:hover {
  background: rgba(0, 0, 0, 0.1);
}
.selene-chatbot .bubble.user .chatbot-reply-quote {
  background: rgba(255, 255, 255, 0.15);
  border-left-color: #93c5fd;
  color: #fff;
}
.selene-chatbot .bubble.user .chatbot-reply-quote:hover {
  background: rgba(255, 255, 255, 0.22);
}
.selene-chatbot .chatbot-reply-quote-sender {
  font-weight: 600;
  font-size: 11px;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  color: #0084ff;
}
.selene-chatbot .bubble.user .chatbot-reply-quote-sender {
  color: #bfdbfe;
}
.selene-chatbot .chatbot-reply-quote-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.9;
  font-size: 11.5px;
}

/* Thanh hiển thị tin nhắn đang Reply phía trên ô nhập liệu */
.selene-chatbot .chatbot-reply-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  background: #f0f2f5;
  border-radius: 8px;
  padding: 7px 12px;
  margin: 8px 12px 0 12px;
  border-left: 3.5px solid #0084ff;
  gap: 10px;
  animation: chatbotReplySlide 0.18s ease-out;
}
@keyframes chatbotReplySlide {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.selene-chatbot .chatbot-reply-banner-body {
  flex: 1;
  min-width: 0;
}
.selene-chatbot .chatbot-reply-banner-title {
  display: flex;
  align-items: center;
  font-size: 11.5px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}
.selene-chatbot .chatbot-reply-banner-text {
  font-size: 12px;
  color: #4b5563;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}
.selene-chatbot .chatbot-reply-banner-close {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.selene-chatbot .chatbot-reply-banner-close:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #0f172a;
}

/* Hiệu ứng nhấp nháy làm nổi bật tin nhắn gốc khi click vào quote */
.selene-chatbot .chatbot-bubble-highlight {
  animation: chatbotPulse 1.5s ease-out;
}
@keyframes chatbotPulse {
  0% { box-shadow: 0 0 0 4px rgba(0, 132, 255, 0.6); }
  100% { box-shadow: none; }
}

/* Nút nổi cuộn xuống đáy khi người dùng đã kéo lên */
.selene-chatbot .chatbot-scroll-bottom-btn {
  position: absolute;
  right: 18px;
  bottom: 84px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #ffffff;
  color: #871b1b;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 30;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 15px;
}
.selene-chatbot .chatbot-scroll-bottom-btn:hover {
  background: #fdf2f2;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(135, 27, 27, 0.25);
}

/* ==========================================================================
   Chatbot Reaction Styles (Biểu cảm tin nhắn trong Chatbot)
   ========================================================================== */

.selene-chatbot .message-row.has-reactions {
  margin-bottom: 22px;
}

.selene-chatbot .chatbot-msg-action-btn.react-btn {
  color: #f59e0b;
}
.selene-chatbot .chatbot-msg-action-btn.react-btn:hover,
.selene-chatbot .chatbot-msg-action-btn.react-btn.active {
  background: #fef3c7;
  border-color: #fde68a;
  color: #d97706;
}

.selene-chatbot .bubble .support-reaction-picker {
  position: absolute;
  bottom: calc(100% + 8px);
  z-index: 120;
}
.selene-chatbot .bubble.user .support-reaction-picker {
  right: 0;
  left: auto;
}
.selene-chatbot .bubble.bot .support-reaction-picker {
  left: 0;
  right: auto;
}

.selene-chatbot .bubble .support-reaction-badge {
  position: absolute;
  bottom: -12px;
  right: 12px;
  z-index: 8;
}
`;

export default Chatbot;

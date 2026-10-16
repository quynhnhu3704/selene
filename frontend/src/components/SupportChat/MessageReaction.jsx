import React, { useState, useEffect, useRef } from "react";
import {
  REACTION_TYPES,
  renderReactionIcon,
  getReactionLabel,
} from "./ReactionIcons";
import { getMessageReactions, removeReaction } from "../../services/chat.service";

/**
 * 1. ReactionPicker: Thanh chọn biểu cảm nổi trên tin nhắn (như trong ảnh mẫu)
 * Gồm 6 biểu cảm + nút Đóng (✕)
 */
export function ReactionPicker({
  currentReaction = null,
  onSelectReaction,
  onRemoveReaction,
  onClose,
  position = "top", // "top" | "bottom"
}) {
  const pickerRef = useRef(null);

  // Lắng nghe sự kiện click ra ngoài để đóng thanh picker
  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose?.();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className={`support-reaction-picker support-reaction-picker-${position}`}
      role="toolbar"
      aria-label="Chọn biểu cảm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="support-reaction-picker-inner">
        {REACTION_TYPES.map((item) => {
          const isSelected =
            currentReaction === item.emoji ||
            item.altEmojis?.includes(currentReaction);
          const Component = item.Icon;

          return (
            <button
              key={item.id}
              type="button"
              className={`support-reaction-item-btn${isSelected ? " selected" : ""}`}
              title={item.label}
              onClick={() => {
                onSelectReaction?.(item.emoji);
              }}
            >
              <Component size={28} />
              <span className="support-reaction-item-label">{item.label}</span>
            </button>
          );
        })}

        {/* Nút Đóng / Gỡ (✕) ở cuối thanh theo đúng ảnh mẫu */}
        <button
          type="button"
          className={`support-reaction-close-btn${currentReaction ? " has-reaction" : ""}`}
          title={currentReaction ? "Gỡ biểu cảm" : "Đóng"}
          onClick={() => {
            if (currentReaction) {
              if (onRemoveReaction) {
                onRemoveReaction();
              } else if (onSelectReaction) {
                onSelectReaction(currentReaction);
              }
            }
            onClose?.();
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span className="support-reaction-item-label">
            {currentReaction ? "Gỡ biểu cảm" : "Đóng"}
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * 2. ReactionBadge: Huy hiệu tổng hợp biểu cảm ở góc dưới tin nhắn (như trong ảnh mẫu)
 * - Nếu chỉ có 1 biểu cảm: hiển thị tròn / pill nhỏ với 1 icon (như bên phải ảnh mẫu)
 * - Nếu nhiều biểu cảm: hiển thị các icon kèm tổng số (ví dụ: 😆 😭 ❤️ 3 như bên trái ảnh mẫu)
 */
export function ReactionBadge({
  messageId,
  reactions = [],
  summary = null,
  currentAccountId = null,
  onClick,
  own = false,
}) {
  // Lấy tổng số lượng biểu cảm
  const total =
    summary?.total ?? (Array.isArray(reactions) ? reactions.length : 0);

  if (!total || total <= 0) return null;

  // Lấy danh sách các biểu cảm xuất hiện (lọc trùng để lấy top distinct)
  const distinctEmojis = [];
  if (Array.isArray(reactions) && reactions.length > 0) {
    reactions.forEach((r) => {
      const e = r.reaction;
      if (e && !distinctEmojis.includes(e)) {
        distinctEmojis.push(e);
      }
    });
  } else if (summary) {
    Object.keys(summary).forEach((k) => {
      if (k !== "total" && summary[k] > 0 && !distinctEmojis.includes(k)) {
        distinctEmojis.push(k);
      }
    });
  }

  // Giới hạn hiển thị tối đa 3 biểu cảm khác nhau
  const displayEmojis = distinctEmojis.slice(0, 3);

  // Kiểm tra tài khoản hiện tại đã thả biểu cảm nào chưa
  const myReaction = Array.isArray(reactions)
    ? reactions.find((r) => String(r.account_id) === String(currentAccountId))
    : null;

  const isSingle = total === 1;

  return (
    <button
      type="button"
      className={`support-reaction-badge${isSingle ? " single" : ""}${
        myReaction ? " has-my-reaction" : ""
      }${own ? " own" : ""}`}
      title={
        myReaction
          ? `Bạn đã thả ${myReaction.reaction} (Nhấp để xem chi tiết)`
          : `Xem chi tiết ${total} người đã thả biểu cảm`
      }
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <span className="support-reaction-badge-icons">
        {displayEmojis.map((emoji, idx) => (
          <span
            key={idx}
            className="support-reaction-badge-icon"
            style={{ zIndex: 3 - idx }}
          >
            {renderReactionIcon(emoji, 15)}
          </span>
        ))}
      </span>

      {/* Nếu tổng > 1 thì hiển thị số lượng theo sau */}
      {!isSingle && (
        <span className="support-reaction-badge-count">{total}</span>
      )}
    </button>
  );
}

/**
 * 3. ReactionDetailModal: Modal hiển thị danh sách chi tiết những người đã thả cảm xúc
 */
export function ReactionDetailModal({
  messageId,
  isOpen,
  onClose,
  currentAccountId = null,
  onRemoveMyReaction,
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ reactions: [], summary: { total: 0 } });
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!isOpen || !messageId) return;

    let isMounted = true;
    setLoading(true);

    getMessageReactions(messageId)
      .then((res) => {
        if (!isMounted) return;
        const resData = res?.data?.data || [];
        const summary = res?.data?.summary || { total: resData.length };
        setData({
          reactions: resData,
          summary,
        });
      })
      .catch((err) => {
        console.warn("Không thể tải chi tiết biểu cảm:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, messageId]);

  if (!isOpen) return null;

  // Lọc danh sách theo tab được chọn
  const filteredReactions = (data.reactions || []).filter((item) => {
    if (activeTab === "all") return true;
    return item.reaction === activeTab;
  });

  // Tạo danh sách tabs từ summary
  const tabs = [{ id: "all", label: `Tất cả ${data.summary?.total || 0}` }];
  if (data.summary) {
    Object.keys(data.summary).forEach((k) => {
      if (k !== "total" && data.summary[k] > 0) {
        tabs.push({
          id: k,
          emoji: k,
          label: `${k} ${data.summary[k]}`,
          count: data.summary[k],
        });
      }
    });
  }

  return (
    <div className="support-reaction-modal-overlay" onClick={onClose}>
      <div
        className="support-reaction-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết biểu cảm tin nhắn"
      >
        {/* Header */}
        <div className="support-reaction-modal-header">
          <h6 className="support-reaction-modal-title">
            <span className="me-2">Biểu cảm tin nhắn</span>
            <span className="badge bg-light text-dark border">
              {data.summary?.total || 0}
            </span>
          </h6>
          <button
            type="button"
            className="support-reaction-modal-close"
            onClick={onClose}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <div className="support-reaction-modal-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`support-reaction-modal-tab${
                  activeTab === tab.id ? " active" : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.emoji && (
                  <span className="me-1">
                    {renderReactionIcon(tab.emoji, 16)}
                  </span>
                )}
                <span>{tab.id === "all" ? `Tất cả (${data.summary?.total || 0})` : tab.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content list */}
        <div className="support-reaction-modal-body">
          {loading ? (
            <div className="text-center py-4 text-muted">
              <span className="spinner-border spinner-border-sm me-2" />
              Đang tải danh sách biểu cảm...
            </div>
          ) : filteredReactions.length === 0 ? (
            <div className="text-center py-4 text-muted">
              Chưa có biểu cảm nào
            </div>
          ) : (
            <div className="support-reaction-user-list">
              {filteredReactions.map((item, index) => {
                const isMe =
                  currentAccountId &&
                  String(item.account_id) === String(currentAccountId);

                return (
                  <div key={index} className="support-reaction-user-row">
                    <div className="support-reaction-user-left">
                      <div className="support-reaction-avatar">
                        {item.user_avatar ? (
                          <img
                            src={item.user_avatar}
                            alt={item.user_name}
                            className="support-reaction-avatar-img"
                          />
                        ) : (
                          <span className="support-reaction-avatar-char">
                            {item.user_name?.charAt(0)?.toUpperCase() || "U"}
                          </span>
                        )}
                        <span className="support-reaction-avatar-icon">
                          {renderReactionIcon(item.reaction, 14)}
                        </span>
                      </div>

                      <div className="support-reaction-info">
                        <div className="support-reaction-name">
                          <strong>{item.user_name || "Người dùng"}</strong>
                          {isMe && <span className="ms-1 text-muted">(Bạn)</span>}
                        </div>
                        <div className="support-reaction-role">
                          {item.is_customer ? "Khách hàng" : "Nhân viên hỗ trợ"}
                        </div>
                      </div>
                    </div>

                    {isMe && onRemoveMyReaction && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm py-0 px-2"
                        style={{ fontSize: "11px", height: "24px" }}
                        onClick={() => {
                          onRemoveMyReaction(messageId);
                          onClose();
                        }}
                      >
                        Gỡ biểu cảm
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

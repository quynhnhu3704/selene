import React from "react";

// 1. Thích / Like (👍)
export function LikeIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`support-reaction-svg ${className}`}
    >
      <defs>
        <linearGradient id="likeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <filter id="likeShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#92400E" floodOpacity="0.25" />
        </filter>
      </defs>
      {/* Hand & Thumb */}
      <g filter="url(#likeShadow)">
        {/* Palm & Wrist */}
        <path
          d="M6 18c0-1.5 1-2.5 2.5-2.5H12v15H8.5C7 30.5 6 29.5 6 28V18z"
          fill="#D97706"
        />
        {/* Thumb */}
        <path
          d="M12.5 16.5C12.5 13 13.5 6 16.5 4.5c2.2-1.1 4.5.5 4 3.5-.8 4.2-2.2 7-1 7h10.2c2.8 0 4.3 2.5 3.8 5.2l-2 10.5c-.5 2.5-2.8 4.3-5.3 4.3H12.5v-14z"
          fill="url(#likeGrad)"
        />
        {/* Knuckles line accents */}
        <path
          d="M27 20h2.5c1 0 1.8.8 1.8 1.8s-.8 1.8-1.8 1.8H26m0 4h2.5c1 0 1.8.8 1.8 1.8s-.8 1.8-1.8 1.8H25"
          stroke="#B45309"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.4"
        />
        {/* Thumb highlight */}
        <path
          d="M17.5 7c.8 1 1 2.5.5 5"
          stroke="#FEF08A"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

// 2. Yêu thích / Love (❤️)
export function LoveIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`support-reaction-svg ${className}`}
    >
      <defs>
        <linearGradient id="loveGrad" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#FF4B72" />
          <stop offset="50%" stopColor="#EF233C" />
          <stop offset="100%" stopColor="#D90429" />
        </linearGradient>
        <filter id="loveShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#7f1d1d" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Heart */}
      <path
        filter="url(#loveShadow)"
        d="M18 31.8C16.8 30.8 5 21.6 5 13C5 7.8 9.2 4 14.2 4C16.9 4 19.5 5.3 21 7.4C22.5 5.3 25.1 4 27.8 4C32.8 4 37 7.8 37 13C37 21.6 25.2 30.8 24 31.8L21 34.2L18 31.8Z"
        transform="translate(-3, -1)"
        fill="url(#loveGrad)"
      />
      {/* Glossy top-left highlight */}
      <ellipse
        cx="11.5"
        cy="9.5"
        rx="3.5"
        ry="2"
        transform="rotate(-35 11.5 9.5)"
        fill="#FFFFFF"
        opacity="0.45"
      />
    </svg>
  );
}

// 3. Haha (😆)
export function HahaIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`support-reaction-svg ${className}`}
    >
      <defs>
        <linearGradient id="hahaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <filter id="hahaShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#78350f" floodOpacity="0.25" />
        </filter>
      </defs>
      {/* Yellow face */}
      <circle cx="18" cy="18" r="16" fill="url(#hahaGrad)" filter="url(#hahaShadow)" />
      {/* Squinted laughing eyes (><) */}
      <path
        d="M8.5 13.5L14 16L8.5 18.5"
        stroke="#5C2605"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M27.5 13.5L22 16L27.5 18.5"
        stroke="#5C2605"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Big open mouth */}
      <path
        d="M10 20C10 26.2 13.6 30.5 18 30.5C22.4 30.5 26 26.2 26 20H10Z"
        fill="#501804"
      />
      {/* Upper white teeth */}
      <path
        d="M11.5 20C12.5 22.2 15 23.2 18 23.2C21 23.2 23.5 22.2 24.5 20H11.5Z"
        fill="#FFFFFF"
      />
      {/* Red tongue */}
      <path
        d="M14 28.5C15.2 29.8 16.5 30.5 18 30.5C19.5 30.5 20.8 29.8 22 28.5C21 26.8 19.5 26 18 26C16.5 26 15 26.8 14 28.5Z"
        fill="#FF4365"
      />
    </svg>
  );
}

// 4. Wow / Bất ngờ (😮)
export function WowIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`support-reaction-svg ${className}`}
    >
      <defs>
        <linearGradient id="wowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <filter id="wowShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#78350f" floodOpacity="0.25" />
        </filter>
      </defs>
      {/* Yellow face */}
      <circle cx="18" cy="18" r="16" fill="url(#wowGrad)" filter="url(#wowShadow)" />
      {/* Raised surprised eyebrows */}
      <path
        d="M9 8.5C11 7 14 7.2 15.5 8.8"
        stroke="#5C2605"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M27 8.5C25 7 22 7.2 20.5 8.8"
        stroke="#5C2605"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Wide cartoon eyes */}
      <ellipse cx="12" cy="14" rx="3.6" ry="4.6" fill="#FFFFFF" />
      <circle cx="11.2" cy="13.2" r="2.2" fill="#221202" />
      <circle cx="12.2" cy="12.2" r="0.8" fill="#FFFFFF" />

      <ellipse cx="24" cy="14" rx="3.6" ry="4.6" fill="#FFFFFF" />
      <circle cx="23.2" cy="13.2" r="2.2" fill="#221202" />
      <circle cx="24.2" cy="12.2" r="0.8" fill="#FFFFFF" />

      {/* Surprised open 'O' mouth */}
      <ellipse cx="18" cy="24.5" rx="4.8" ry="6.2" fill="#451403" />
      <ellipse cx="18" cy="27" rx="3.2" ry="3" fill="#6B1D04" opacity="0.6" />
    </svg>
  );
}

// 5. Buồn / Khóc (😭)
export function SadIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`support-reaction-svg ${className}`}
    >
      <defs>
        <linearGradient id="sadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="tearGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <filter id="sadShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#78350f" floodOpacity="0.25" />
        </filter>
      </defs>
      {/* Yellow face */}
      <circle cx="18" cy="18" r="16" fill="url(#sadGrad)" filter="url(#sadShadow)" />
      {/* Streams of blue tears flowing straight down both sides (như trong ảnh mẫu) */}
      <path
        d="M10 16.5C10 16.5 10 33 11.5 33.5C13 33 13.5 16.5 13.5 16.5H10Z"
        fill="url(#tearGrad)"
      />
      <path
        d="M22.5 16.5C22.5 16.5 23 33 24.5 33.5C26 33 26 16.5 26 16.5H22.5Z"
        fill="url(#tearGrad)"
      />
      {/* Sad downward-sloping eyebrows */}
      <path
        d="M8.5 11.8C10.5 10.8 13.2 11.2 14.8 12.8"
        stroke="#5C2605"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M27.5 11.8C25.5 10.8 22.8 11.2 21.2 12.8"
        stroke="#5C2605"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Crying squinted eyes */}
      <path
        d="M9.5 16.5C11 15 13 15 14.5 16.5"
        stroke="#5C2605"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M26.5 16.5C25 15 23 15 21.5 16.5"
        stroke="#5C2605"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Trembling downturned mouth */}
      <path
        d="M13.5 26C15 24.8 16.5 24.2 18 24.2C19.5 24.2 21 24.8 22.5 26"
        stroke="#5C2605"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 6. Phẫn nộ / Angry (😡)
export function AngryIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`support-reaction-svg ${className}`}
    >
      <defs>
        <linearGradient id="angryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FF6B4A" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
        <filter id="angryShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#7f1d1d" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Red-orange face */}
      <circle cx="18" cy="18" r="16" fill="url(#angryGrad)" filter="url(#angryShadow)" />
      {/* 4-pointed white star / anger sparkle on upper forehead (như trong ảnh mẫu) */}
      <path
        d="M27 6.5L27.8 8.2L29.5 9L27.8 9.8L27 11.5L26.2 9.8L24.5 9L26.2 8.2L27 6.5Z"
        fill="#FFFFFF"
      />
      {/* Slanted furious dark eyebrows */}
      <path
        d="M7 11.5L15 15"
        stroke="#2E0A05"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M29 11.5L21 15"
        stroke="#2E0A05"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Angry eyes */}
      <ellipse cx="12.5" cy="17" rx="2.4" ry="2.8" fill="#FFFFFF" />
      <circle cx="13" cy="17" r="1.5" fill="#2E0A05" />

      <ellipse cx="23.5" cy="17" rx="2.4" ry="2.8" fill="#FFFFFF" />
      <circle cx="23" cy="17" r="1.5" fill="#2E0A05" />

      {/* Downward angry frown mouth */}
      <path
        d="M13.5 25.5C15 23.8 16.5 23 18 23C19.5 23 21 23.8 22.5 25.5"
        stroke="#2E0A05"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 6 loại reaction chuẩn theo thứ tự như ảnh mẫu
export const REACTION_TYPES = [
  { id: "like", emoji: "👍", label: "Thích", Icon: LikeIcon },
  { id: "love", emoji: "❤️", label: "Yêu thích", Icon: LoveIcon },
  { id: "haha", emoji: "😆", label: "Haha", altEmojis: ["😂"], Icon: HahaIcon },
  { id: "wow", emoji: "😮", label: "Bất ngờ", Icon: WowIcon },
  { id: "sad", emoji: "😭", label: "Buồn", altEmojis: ["😢"], Icon: SadIcon },
  { id: "angry", emoji: "😡", label: "Phẫn nộ", Icon: AngryIcon },
];

/**
 * Trả về icon component tương ứng với emoji hoặc chuỗi biểu cảm
 */
export function renderReactionIcon(emoji, size = 18, className = "") {
  if (!emoji) return null;
  const item = REACTION_TYPES.find(
    (r) => r.emoji === emoji || r.id === emoji || r.altEmojis?.includes(emoji)
  );
  if (item) {
    const Component = item.Icon;
    return <Component size={size} className={className} />;
  }
  // Fallback: Unicode emoji
  return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>{emoji}</span>;
}

/**
 * Tìm thông tin nhãn của biểu cảm
 */
export function getReactionLabel(emoji) {
  const item = REACTION_TYPES.find(
    (r) => r.emoji === emoji || r.id === emoji || r.altEmojis?.includes(emoji)
  );
  return item ? item.label : "Biểu cảm";
}

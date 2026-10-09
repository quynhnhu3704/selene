import { io } from "socket.io-client";
import { getAccessToken } from "../utils/auth";

export const createChatSocket = () => {
  const token = getAccessToken();
  if (!token) {
    return null;
  }

  try {
    const socket = io({
      path: "/api/chat/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true,
    });

    return socket;
  } catch (err) {
    console.warn("Lỗi khởi tạo socket chat:", err);
    return null;
  }
};



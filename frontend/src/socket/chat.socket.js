import { io } from "socket.io-client";
import { getAccessToken } from "../utils/auth";
import { getChatSession } from "../services/chat.service";

export const createChatSocket = () => {
  const apiUrl = import.meta.env.DEV ? window.location.origin : (import.meta.env.VITE_API_URL || window.location.origin);
  const socket = io(new URL(apiUrl, window.location.origin).origin, {
    path: "/api/chat/socket.io",
    autoConnect: false,
    auth: (callback) => callback({ token: getAccessToken() }),
  });
  let timer;
  let disposed = false;
  const reconnect = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        // REST sử dụng cơ chế refresh token hiện có trước khi nối lại socket.
        await getChatSession();
        if (!disposed) socket.connect();
      } catch {
        if (!disposed) reconnect();
      }
    }, 3000);
  };
  socket.on("connect_error", reconnect);
  socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") reconnect();
  });
  socket.dispose = () => {
    disposed = true;
    clearTimeout(timer);
    socket.removeAllListeners();
    socket.disconnect();
  };
  return socket;
};

import { Server } from "socket.io";
import { config } from "./configs/index.js";
import { authenticate } from "./middlewares/auth.middleware.js";
import {
  ConversationService,
  hasPermission,
} from "./services/conversation.service.js";
import { ReactionService } from "./services/reaction.service.js";

// Chỉ phát nội dung đến các socket còn quyền đọc ở thời điểm phát tin.
export const emitConversation = async (io, conversation, event, data) => {
  const sockets = await io
    .in(`conversation:${conversation.conversation_id}`)
    .fetchSockets();
  await Promise.all(
    sockets.map(async (socket) => {
      try {
        const user = await authenticate(socket.handshake.auth.token);
        if (
          (user.role === "customer" &&
            String(user.accountId) === String(conversation.customer_id)) ||
          hasPermission(user, "chat:view")
        ) {
          socket.emit(event, data);
        } else socket.leave(`conversation:${conversation.conversation_id}`);
      } catch {
        socket.disconnect(true);
      }
    }),
  );
};

export const notifyConversation = (io, conversation) => {
  // Inbox chỉ nhận tín hiệu tải lại; dữ liệu được kiểm tra quyền qua REST.
  io.to("support:staff")
    .to(`customer:${conversation.customer_id}`)
    .to(`conversation:${conversation.conversation_id}`)
    .emit("conversation:update", {
      conversation_id: conversation.conversation_id,
      status: conversation.status,
    });
};

export const createChatSocket = (server) => {
  const io = new Server(server, {
    path: "/api/chat/socket.io",
    cors: { origin: config.frontendUrl, credentials: true },
    maxHttpBufferSize: 16384,
  });
  io.use(async (socket, next) => {
    try {
      socket.user = await authenticate(socket.handshake.auth.token);
      next();
    } catch (error) {
      next(new Error(error.message));
    }
  });
  io.on("connection", (socket) => {
    const timer = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, socket.user.exp * 1000 - Date.now()),
    );
    socket.on("disconnect", () => clearTimeout(timer));
    if (socket.user.role === "customer")
      socket.join(`customer:${socket.user.accountId}`);
    if (hasPermission(socket.user, "chat:view")) socket.join("support:staff");
    socket.on("conversation:join", async (id, ack) => {
      try {
        const user = await authenticate(socket.handshake.auth.token);
        await ConversationService.getAccessible(user, id);
        await socket.join(`conversation:${id}`);
        if (typeof ack === "function") ack({ success: true });
      } catch (error) {
        if (typeof ack === "function")
          ack({
            success: false,
            message: error.status ? error.message : "Không thể mở hội thoại!",
          });
      }
    });
    socket.on("conversation:leave", (id) => {
      if (typeof id === "string") socket.leave(`conversation:${id}`);
    });
    socket.on("message:reaction", async (payload, ack) => {
      try {
        const user = await authenticate(socket.handshake.auth.token);
        const { message_id, messageId, reaction, emoji } = payload || {};
        const targetMsgId = message_id || messageId;
        const result = await ReactionService.reactToMessage(
          user,
          targetMsgId,
          reaction || emoji
        );

        const targetRooms = [
          `conversation:${result.conversation_id}`,
          result.conversation?.customer_id ? `customer:${result.conversation.customer_id}` : null,
          "support:staff",
        ].filter(Boolean);

        let emitter = io;
        targetRooms.forEach((room) => {
          emitter = emitter.to(room);
        });

        emitter.emit("message:reaction", {
          action: result.action,
          message_id: result.message_id,
          conversation_id: result.conversation_id,
          account_id: result.account_id,
          reaction: result.reaction,
          reaction_id: result.reaction_id,
          reactions: result.reactions,
          summary: result.summary,
        });

        if (result.conversation) {
          notifyConversation(io, result.conversation);
        }

        if (typeof ack === "function") ack({ success: true, data: result });
      } catch (error) {
        if (typeof ack === "function") {
          ack({
            success: false,
            message: error.status ? error.message : (error.message || "Không thể thực hiện reaction!"),
          });
        }
      }
    });
  });
  return io;
};

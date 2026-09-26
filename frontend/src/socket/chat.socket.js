// Dummy socket object for staff chat (real socket connection disabled)
export const createChatSocket = () => {
  const dummySocket = {
    connected: true,
    on: () => dummySocket,
    off: () => dummySocket,
    emit: (...args) => {
      const lastArg = args[args.length - 1];
      if (typeof lastArg === "function") {
        lastArg(null, { success: true });
      }
      return dummySocket;
    },
    timeout: () => dummySocket,
    connect: () => {
      dummySocket.connected = true;
      return dummySocket;
    },
    disconnect: () => {
      dummySocket.connected = false;
      return dummySocket;
    },
    dispose: () => {
      dummySocket.connected = false;
    },
    removeAllListeners: () => dummySocket,
  };
  return dummySocket;
};

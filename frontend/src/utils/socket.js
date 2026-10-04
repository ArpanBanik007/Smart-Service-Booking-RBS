import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, "")
    : "https://smart-service-booking-rbs.onrender.com");

let socket = null;

/**
 * Connect to the Socket.IO server and join the user's room.
 * Reuses existing connection if already connected.
 */
export const connectSocket = (userId) => {
  if (socket?.connected) {
    // Already connected, just re-join room
    socket.emit("join", userId);
    return socket;
  }

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket.id);
    if (userId) {
      socket.emit("join", userId);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  socket.on("reconnect", () => {
    console.log("[Socket] Reconnected");
    if (userId) {
      socket.emit("join", userId);
    }
  });

  return socket;
};

/**
 * Disconnect from the Socket.IO server.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Get the current socket instance (may be null if not connected).
 */
export const getSocket = () => socket;

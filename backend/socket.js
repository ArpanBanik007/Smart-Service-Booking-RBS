import { Server } from "socket.io";

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // When client authenticates or joins their user room
    socket.on("join", (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    socket.on("disconnect", () => {
      // Clean disconnect
    });
  });

  return io;
};

export const getIO = () => io;

export const emitToUser = (userId, event, data) => {
  if (!io || !userId) return;
  io.to(`user_${userId.toString()}`).emit(event, data);
};

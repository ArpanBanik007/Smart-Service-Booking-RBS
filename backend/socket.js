import { Server } from "socket.io";

let io = null;

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://nearit.vercel.app",
];

if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== "*") {
  process.env.CORS_ORIGIN.split(",").forEach((origin) => {
    const trimmed = origin.trim().replace(/\/$/, "");
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

if (process.env.FRONTEND_URL) {
  const trimmed = process.env.FRONTEND_URL.trim().replace(/\/$/, "");
  if (trimmed && !allowedOrigins.includes(trimmed)) {
    allowedOrigins.push(trimmed);
  }
}

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/$/, "");
        if (
          allowedOrigins.includes(origin) ||
          allowedOrigins.includes(normalized)
        ) {
          return callback(null, true);
        }
        return callback(new Error(`Not allowed by CORS: ${origin}`));
      },
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

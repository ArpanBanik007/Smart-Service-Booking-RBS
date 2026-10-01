import dotenv from "dotenv";
import http from "http";
import connectDB from "./DB/index.js";
import app from "./app.js";
import { initSocket } from "./socket.js";

dotenv.config({
  path: "./.env",
});

const server = http.createServer(app);
initSocket(server);

connectDB()
  .then(() => {
    const PORT = process.env.PORT || 8000;

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection error", error);
  });
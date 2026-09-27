import dotenv from "dotenv";
import connectDB from "./DB/index.js";
import app from "./app.js";
// import { initSocket } from "./socket.js";

dotenv.config({
  path: "./.env",
});



connectDB()
  .then(() => {
    const PORT = process.env.PORT || 8000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection error", error);
  });
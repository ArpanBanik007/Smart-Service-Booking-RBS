import cookieParser from "cookie-parser";
import express from "express";
import cors from "cors";

import userRoute from "./routes/user.routes.js";
import providerRouter from "./routes/provider.routes.js";
import providerVerificationRouter from "./routes/providerVerification.routes.js";
import catagoryRouter from "./routes/category.routes.js";
import serviceRouter from "./routes/service.routes.js";
import addressRouter from "./routes/address.routes.js";
import bookingRouter from "./routes/booking.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import refundRoutes from "./routes/refund.routes.js";
import reviewRouter from "./routes/review.routes.js";
import adminRouter from "./routes/admin.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import paymentWebhookRouter from "./routes/paymentWebhook.routes.js";

const app = express();

app.set("trust proxy", 1);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running",
  });
});

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Not allowed by CORS")
      );
    },
    credentials: true,
  })
);


// Razorpay webhook MUST come before express.json()

app.use(
  "/api/v1/webhooks",
  paymentWebhookRouter
);


app.use(
  express.json({
    limit: "10kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10kb",
  })
);

app.use(express.static("public"));

app.use(cookieParser());


// Routes

app.use("/api/v1/users", userRoute);
app.use("/api/v1/provider", providerRouter);
app.use(
  "/api/v1/provider-verification",
  providerVerificationRouter
);
app.use("/api/v1/catagory", catagoryRouter);
app.use("/api/v1/services", serviceRouter);
app.use("/api/v1/addresses", addressRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/refunds", refundRoutes);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/admin", adminRouter);
app.use(
  "/api/v1/notifications",
  notificationRouter
);


// Global Error Handling Middleware

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message =
    err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [],
    stack:
      process.env.NODE_ENV === "development"
        ? err.stack
        : undefined,
  });
});

export default app;
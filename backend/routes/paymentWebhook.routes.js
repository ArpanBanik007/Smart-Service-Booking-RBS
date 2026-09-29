import { Router } from "express";
import express from "express";

import {
  paymentWebhook,
} from "../controller/paymentWebhook.controller.js";

const router = Router();

router.post(
  "/razorpay",
  express.raw({
    type: "application/json",
  }),
  paymentWebhook
);

export default router;
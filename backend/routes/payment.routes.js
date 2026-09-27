import { Router } from "express";

import { verifyJWT } from "../middlewire/auth.middlewire.js";

import {
    createPaymentOrder,
    verifyPayment,
    getPaymentByBooking,
    getMyPayments,
} from "../controller/payment.controller.js";

const router = Router();

router.post(
    "/create-order",
    verifyJWT,
    createPaymentOrder
);

router.post(
    "/verify",
    verifyJWT,
    verifyPayment
);

router.get(
    "/booking/:bookingId",
    verifyJWT,
    getPaymentByBooking
);

router.get(
    "/my-payments",
    verifyJWT,
    getMyPayments
);

export default router;
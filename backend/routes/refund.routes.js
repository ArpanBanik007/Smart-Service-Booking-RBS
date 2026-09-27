import { Router } from "express";

import { verifyJWT } from "../middlewire/auth.middlewire.js";
import { authorizeRole } from "../middlewire/role.middlewire.js";

import {
    requestRefund,
    getMyRefunds,
    getRefundById,
    getRefundRequests,
    processRefund,
    rejectRefund,
} from "../controller/refund.controller.js";

const router = Router();

router.get(
    "/admin/requests",
    verifyJWT,
    authorizeRole("admin"),
    getRefundRequests
);

router.patch(
    "/admin/:refundId/process",
    verifyJWT,
    authorizeRole("admin"),
    processRefund
);

router.patch(
    "/admin/:refundId/reject",
    verifyJWT,
    authorizeRole("admin"),
    rejectRefund
);

router.post(
    "/",
    verifyJWT,
    authorizeRole("user"),
    requestRefund
);

router.get(
    "/my-refunds",
    verifyJWT,
    authorizeRole("user"),
    getMyRefunds
);

router.get(
    "/:refundId",
    verifyJWT,
    authorizeRole("user"),
    getRefundById
);

export default router;
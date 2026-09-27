import { Router } from "express";

import { verifyJWT } from "../middlewire/auth.middlewire.js";

import {
    getMyNotifications,
    getUnreadNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
} from "../controller/notification.controller.js";

const router = Router();

router.get("/", verifyJWT, getMyNotifications);

router.get("/unread", verifyJWT, getUnreadNotifications);

router.patch(
    "/:notificationId/read",
    verifyJWT,
    markNotificationAsRead
);

router.patch(
    "/read-all",
    verifyJWT,
    markAllNotificationsAsRead
);

router.delete(
    "/:notificationId",
    verifyJWT,
    deleteNotification
);

export default router;
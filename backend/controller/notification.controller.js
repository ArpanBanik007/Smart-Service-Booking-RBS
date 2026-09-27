import mongoose from "mongoose";

import { Notification } from "../models/notification.model.js";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";


const getMyNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
        Math.max(Number(req.query.limit) || 20, 1),
        50
    );

    const skip = (page - 1) * limit;

    const filter = {
        recipient: userId,
    };

    const [notifications, totalNotifications] = await Promise.all([
        Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),

        Notification.countDocuments(filter),
    ]);

    const unreadNotifications = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                notifications,
                unreadNotifications,
                pagination: {
                    page,
                    limit,
                    totalNotifications,
                    totalPages: Math.ceil(
                        totalNotifications / limit
                    ),
                },
            },
            "Notifications fetched successfully"
        )
    );
});


const getUnreadNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const notifications = await Notification.find({
        recipient: userId,
        isRead: false,
    })
        .sort({ createdAt: -1 })
        .limit(50);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                notifications,
                count: notifications.length,
            },
            "Unread notifications fetched successfully"
        )
    );
});


const markNotificationAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new ApiError(400, "Invalid notification ID");
    }

    const notification = await Notification.findOneAndUpdate(
        {
            _id: notificationId,
            recipient: userId,
        },
        {
            $set: {
                isRead: true,
                readAt: new Date(),
            },
        },
        {
            new: true,
        }
    );

    if (!notification) {
        throw new ApiError(404, "Notification not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            notification,
            "Notification marked as read"
        )
    );
});


const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const result = await Notification.updateMany(
        {
            recipient: userId,
            isRead: false,
        },
        {
            $set: {
                isRead: true,
                readAt: new Date(),
            },
        }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                modifiedCount: result.modifiedCount,
            },
            "All notifications marked as read"
        )
    );
});


const deleteNotification = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        throw new ApiError(400, "Invalid notification ID");
    }

    const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId,
    });

    if (!notification) {
        throw new ApiError(404, "Notification not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Notification deleted successfully"
        )
    );
});


export {
    getMyNotifications,
    getUnreadNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
};
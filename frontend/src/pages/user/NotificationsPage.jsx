import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import UserPageShell from "./UserPageShell.jsx";
import {
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiTrash2,
  FiClock,
} from "react-icons/fi";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all' | 'unread'
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchNotifications = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const endpoint =
        filter === "unread"
          ? ENDPOINTS.NOTIFICATIONS.UNREAD
          : ENDPOINTS.NOTIFICATIONS.LIST;
      const res = await api.get(endpoint);
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : res.data?.data?.notifications || [];
      setNotifications(list);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      await api.patch(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Mark all read error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(ENDPOINTS.NOTIFICATIONS.DELETE(id));
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error("Delete notification error:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <UserPageShell
      title="Notifications"
      subtitle="Stay updated with order progress, service updates, and account alerts"
    >
      {/* Header action bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              filter === "all"
                ? "bg-indigo-600 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              filter === "unread"
                ? "bg-indigo-600 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Unread Only {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {/* Mark All Read button */}
        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            disabled={actionLoading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <FiCheckCircle className="text-emerald-600" />
            Mark all as read
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">
            <FiBell />
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-800">
            No notifications
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {filter === "unread"
              ? "You have read all your notifications."
              : "You have no system or booking notifications yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => {
            const isUnread = !item.isRead;
            return (
              <div
                key={item._id}
                className={`relative flex items-start justify-between gap-4 rounded-2xl border p-4 transition ${
                  isUnread
                    ? "border-indigo-100 bg-indigo-50/40 shadow-xs"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${
                      isUnread
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <FiBell />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {item.title || "Platform Update"}
                      </h4>
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-indigo-600" />
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {item.message || item.content}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <FiClock className="text-xs" />
                        {new Date(item.createdAt || Date.now()).toLocaleDateString()}{" "}
                        {new Date(item.createdAt || Date.now()).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {item.bookingId && (
                        <Link
                          to={`/booking/status/${item.bookingId}`}
                          className="font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          View Booking &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isUnread && (
                    <button
                      type="button"
                      title="Mark as read"
                      onClick={() => handleMarkAsRead(item._id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                    >
                      <FiCheck />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Delete notification"
                    onClick={() => handleDelete(item._id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </UserPageShell>
  );
}

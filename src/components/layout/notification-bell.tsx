"use client";

import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from "@/services/notification-service";
import type { Notification } from "@/types/notification";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications(userId, (result) => {
      if (result.success) {
        setNotifications(result.data);
        setError(null);
      } else {
        setError(result.error.message);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [userId]);

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  async function markOne(notificationId: string) {
    if (busyId) return;
    setBusyId(notificationId);
    const result = await markNotificationAsRead(notificationId);
    if (!result.success) setError(result.error.message);
    setBusyId(null);
  }

  async function markAll() {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    const result = await markAllNotificationsAsRead(userId);
    if (!result.success) setError(result.error.message);
    setMarkingAll(false);
  }

  return (
    <details className="relative">
      <summary
        className="relative flex size-11 cursor-pointer list-none items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
        aria-label={`Bildirimler${unreadCount ? `, ${unreadCount} okunmamış` : ""}`}
      >
        <Bell aria-hidden="true" className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </summary>

      <div className="absolute right-0 top-13 z-30 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-bold text-slate-950">Bildirimler</h2>
          <button
            type="button"
            disabled={markingAll || unreadCount === 0}
            onClick={() => void markAll()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 disabled:opacity-50"
          >
            {markingAll ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-3.5 animate-spin"
              />
            ) : (
              <CheckCheck aria-hidden="true" className="size-3.5" />
            )}
            Tümünü okundu yap
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <LoaderCircle
                aria-hidden="true"
                className="size-5 animate-spin text-blue-700"
              />
            </div>
          ) : error ? (
            <p className="p-4 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : notifications.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              Henüz bildirimin yok.
            </p>
          ) : (
            notifications.map((notification) => (
              <article
                key={notification.id}
                className={`border-b border-slate-100 p-4 last:border-0 ${
                  notification.isRead ? "bg-white" : "bg-blue-50"
                }`}
              >
                <div className="flex gap-3">
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      notification.isRead ? "bg-slate-300" : "bg-blue-600"
                    }`}
                    aria-label={
                      notification.isRead ? "Okundu" : "Okunmadı"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-950">
                      {notification.title}
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      {notification.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <time className="text-xs text-slate-400">
                        {new Intl.DateTimeFormat("tr-TR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(notification.createdAt))}
                      </time>
                      {!notification.isRead && (
                        <button
                          type="button"
                          disabled={busyId === notification.id}
                          onClick={() => void markOne(notification.id)}
                          className="text-xs font-semibold text-blue-700 disabled:opacity-50"
                        >
                          {busyId === notification.id
                            ? "İşleniyor..."
                            : "Okundu yap"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </details>
  );
}

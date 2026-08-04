"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from "@/services/notification-service";
import type { Notification } from "@/types/notification";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function NotificationList() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToNotifications(user.id, (result) => {
      if (result.success) {
        setItems(result.data);
        setError(null);
      } else setError(result.error.message);
      setLoading(false);
    }, 100);
  }, [user]);

  const unreadCount = items.filter((item) => !item.read).length;

  async function open(item: Notification) {
    if (!item.read) {
      const result = await markNotificationAsRead(item.id);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
    }
    if (item.link) router.push(item.link);
  }

  async function markAll() {
    if (!user || markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    const result = await markAllNotificationsAsRead(user.id);
    if (!result.success) setError(result.error.message);
    setMarkingAll(false);
  }

  if (loading) return <div className="flex justify-center py-16"><LoaderCircle className="size-7 animate-spin text-blue-700" aria-label="Bildirimler yükleniyor" /></div>;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 sm:p-6">
        <p className="text-sm text-slate-600">{unreadCount} okunmamış bildirim</p>
        <Button variant="secondary" disabled={markingAll || unreadCount === 0} onClick={() => void markAll()}>
          {markingAll ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <CheckCheck className="size-4" aria-hidden="true" />}
          Tümünü okundu işaretle
        </Button>
      </div>
      {error && <p className="m-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      {items.length === 0 ? (
        <div className="grid place-items-center gap-3 px-4 py-16 text-center text-slate-500"><Bell className="size-9" aria-hidden="true" /><p>Henüz bildirimin yok.</p></div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => void open(item)} className={`block w-full p-4 text-left transition-colors hover:bg-slate-50 sm:px-6 ${item.read ? "bg-white" : "bg-blue-50"}`}>
              <span className="flex items-start gap-3">
                <span className={`mt-2 size-2 shrink-0 rounded-full ${item.read ? "bg-slate-300" : "bg-blue-600"}`} />
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-950">{item.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600">{item.message}</span>
                  <time className="mt-2 block text-xs text-slate-400">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

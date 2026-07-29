"use client";

import { useAuth } from "@/hooks/use-auth";
import { recordUserActivity } from "@/services/user-activity-service";
import { useEffect } from "react";

const ACTIVITY_INTERVAL_MS = 15 * 60 * 1000;

export function UserActivityTracker() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;

    let lastRecordedAt = 0;
    const record = () => {
      const now = Date.now();
      if (
        document.visibilityState !== "visible" ||
        now - lastRecordedAt < ACTIVITY_INTERVAL_MS
      ) {
        return;
      }
      lastRecordedAt = now;
      void recordUserActivity();
    };

    record();
    window.addEventListener("focus", record);
    document.addEventListener("visibilitychange", record);
    return () => {
      window.removeEventListener("focus", record);
      document.removeEventListener("visibilitychange", record);
    };
  }, [loading, user]);

  return null;
}

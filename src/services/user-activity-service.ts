import "client-only";

import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function recordUserActivity(): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  const date = localDateKey(new Date());
  const activityId = `${date}__${userId}`;
  await Promise.all([
    setDoc(
      doc(db, "dailyActiveUsers", activityId),
      {
        id: activityId,
        userId,
        date,
        lastActiveAt: serverTimestamp(),
      },
      { merge: true },
    ),
    setDoc(
      doc(db, "userActivity", userId),
      { userId, lastActiveAt: serverTimestamp() },
      { merge: true },
    ),
  ]);
}

import type { Meeting } from "@/types/meeting";

const JITSI_ORIGIN = "https://meet.jit.si";
const JOIN_EARLY_MS = 15 * 60 * 1000;
const JOIN_AFTER_END_MS = 4 * 60 * 60 * 1000;

export function createSecureMeetingRoomId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `hedef-kapisi-${token}`;
}

export function createJitsiMeetingLink(roomId: string): string {
  return `${JITSI_ORIGIN}/${encodeURIComponent(roomId)}`;
}

export type JoinAvailability = {
  enabled: boolean;
  reason: string | null;
};

export function getMeetingJoinAvailability(
  meeting: Meeting,
  userId: string | undefined,
  now = new Date(),
): JoinAvailability {
  if (!userId || !meeting.participantIds.includes(userId)) return { enabled: false, reason: "Bu toplantının katılımcısı değilsiniz." };
  if (meeting.meetingType !== "online") return { enabled: false, reason: "Bu toplantı çevrim içi değil." };
  if (meeting.status === "pending") return { enabled: false, reason: "Toplantı kabul edildikten sonra katılım açılır." };
  if (meeting.status === "cancelled" || meeting.status === "rejected") return { enabled: false, reason: "Bu toplantı iptal edilmiş veya reddedilmiş." };
  if (meeting.status !== "accepted") return { enabled: false, reason: "Bu toplantıya artık katılım sağlanamaz." };
  const nowMs = now.getTime();
  if (nowMs < new Date(meeting.startAt).getTime() - JOIN_EARLY_MS) return { enabled: false, reason: "Katılım toplantıdan 15 dakika önce açılır." };
  if (nowMs > new Date(meeting.endAt).getTime() + JOIN_AFTER_END_MS) return { enabled: false, reason: "Toplantının katılım süresi sona erdi." };
  if (!meeting.meetingLink) return { enabled: false, reason: "Görüşme bağlantısı hazırlanıyor." };
  return { enabled: true, reason: null };
}

import "client-only";

import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { meetingSchema } from "@/lib/validations/meeting-schema";
import { createJitsiMeetingLink, createSecureMeetingRoomId } from "@/lib/meetings/jitsi";
import { createNotification } from "@/services/notification-service";
import type { Meeting, MeetingStatus } from "@/types/meeting";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

type Result<T> = { success: true; data: T } | { success: false; error: { message: string } };

function istanbulLocalToDate(value: string): Date {
  // Türkiye 2016'dan beri kalıcı UTC+03:00 kullanıyor. datetime-local değerini
  // tarayıcının bulunduğu saat diliminden bağımsız olarak İstanbul anına çevirir.
  return new Date(`${value}:00+03:00`);
}

function toIso(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate(): Date }).toDate().toISOString();
  }
  return typeof value === "string" ? value : new Date(0).toISOString();
}

function mapMeeting(snapshot: QueryDocumentSnapshot<DocumentData> | { id: string; data(): DocumentData }): Meeting {
  const data = snapshot.data();
  const meetingType = data.meetingType === "phone" || data.meetingType === "face_to_face" ? data.meetingType : "online";
  return {
    id: snapshot.id,
    conversationId: data.conversationId,
    ideaId: data.ideaId,
    title: data.title,
    description: data.description ?? "",
    participantIds: data.participantIds,
    organizerId: data.organizerId,
    startAt: toIso(data.startAt),
    endAt: toIso(data.endAt),
    location: data.location ?? null,
    meetingType,
    meetingProvider: data.meetingProvider === "jitsi" ? "jitsi" : null,
    meetingRoomId: data.meetingRoomId ?? null,
    meetingLink: data.meetingLink ?? null,
    meetingUrl: data.meetingUrl ?? null,
    status: data.status,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function failure(error: unknown, operation: string): Result<never> {
  console.error(`[meeting-service] ${operation} failed`, error);
  return { success: false, error: { message: error instanceof Error ? error.message : "Toplantı işlemi tamamlanamadı." } };
}

export async function createMeeting(input: unknown): Promise<Result<string>> {
  const user = auth.currentUser;
  if (!user) return { success: false, error: { message: "Toplantı planlamak için giriş yapmalısınız." } };
  const parsed = meetingSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: { message: parsed.error.issues[0]?.message ?? "Toplantı bilgileri geçersiz." } };
  try {
    const conversation = await getDoc(doc(db, "conversations", parsed.data.conversationId));
    if (!conversation.exists()) return { success: false, error: { message: "Bağlı sohbet bulunamadı." } };
    const conversationData = conversation.data();
    if (!Array.isArray(conversationData.participantIds) || !conversationData.participantIds.includes(user.uid)) {
      return { success: false, error: { message: "Bu görüşme için toplantı planlama yetkiniz yok." } };
    }
    const reference = doc(collection(db, "meetings"));
    const meetingRoomId = parsed.data.meetingType === "online" ? createSecureMeetingRoomId() : null;
    const payload = {
      conversationId: parsed.data.conversationId,
      ideaId: conversationData.ideaId,
      title: parsed.data.title,
      description: parsed.data.description,
      participantIds: conversationData.participantIds,
      organizerId: user.uid,
      startAt: istanbulLocalToDate(parsed.data.startAt),
      endAt: istanbulLocalToDate(parsed.data.endAt),
      location: parsed.data.location || null,
      meetingType: parsed.data.meetingType,
      meetingProvider: meetingRoomId ? "jitsi" : null,
      meetingRoomId,
      meetingLink: meetingRoomId ? createJitsiMeetingLink(meetingRoomId) : null,
      meetingUrl: null,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    console.log("[meeting-service] createMeeting payload", {
      path: `meetings/${reference.id}`,
      collection: "meetings",
      documentId: reference.id,
      authUid: user.uid,
      fields: Object.keys(payload),
      payload,
    });
    await setDoc(reference, payload);
    await Promise.all(
      conversationData.participantIds
        .filter((participantId: string) => participantId !== user.uid)
        .map((participantId: string) =>
          createNotification({
            userId: participantId,
            sourceId: reference.id,
            title: "Yeni toplantı oluşturuldu",
            message: `“${parsed.data.title}” toplantısı takviminize eklendi.`,
            type: "meeting_created",
            link: `/takvim/${reference.id}`,
          }),
        ),
    );
    return { success: true, data: reference.id };
  } catch (error) {
    return failure(error, "createMeeting");
  }
}

export function subscribeToMeetings(
  userId: string,
  callback: (result: Result<Meeting[]>) => void,
  admin = false,
): () => void {
  const meetingsQuery = admin
    ? query(collection(db, "meetings"), orderBy("startAt", "desc"), limit(200))
    : query(collection(db, "meetings"), where("participantIds", "array-contains", userId), orderBy("startAt", "asc"), limit(100));
  console.log("[meeting-service] subscribeToMeetings query", {
    path: "meetings",
    authUid: auth.currentUser?.uid ?? null,
    requestedUserId: userId,
    admin,
    filters: admin
      ? ["orderBy(startAt, desc)", "limit(200)"]
      : [`participantIds array-contains ${userId}`, "orderBy(startAt, asc)", "limit(100)"],
  });
  return onSnapshot(
    meetingsQuery,
    (snapshot) => callback({ success: true, data: snapshot.docs.map(mapMeeting) }),
    (error) => callback(failure(error, "subscribeToMeetings")),
  );
}

export async function getMeeting(id: string): Promise<Result<Meeting>> {
  try {
    const snapshot = await getDoc(doc(db, "meetings", id));
    if (!snapshot.exists()) return { success: false, error: { message: "Toplantı bulunamadı." } };
    let meeting = mapMeeting(snapshot);
    if (meeting.meetingType === "online" && !meeting.meetingLink && auth.currentUser?.uid === meeting.organizerId) {
      const backfill = await backfillJitsiMeeting(id);
      if (backfill.success) meeting = backfill.data;
    }
    return { success: true, data: meeting };
  } catch (error) {
    return failure(error, "getMeeting");
  }
}

export async function updateMeetingStatus(id: string, status: MeetingStatus): Promise<Result<null>> {
  try {
    const snapshot = await getDoc(doc(db, "meetings", id));
    if (!snapshot.exists()) return { success: false, error: { message: "Toplantı bulunamadı." } };
    await updateDoc(doc(db, "meetings", id), { status, updatedAt: serverTimestamp() });
    if (status === "accepted") {
      const meeting = mapMeeting(snapshot);
      const actorId = auth.currentUser?.uid;
      if (actorId) await Promise.all(
        meeting.participantIds.filter((participantId) => participantId !== actorId).map((participantId) =>
          createNotification({
            userId: participantId,
            sourceId: id,
            title: "Toplantı kabul edildi",
            message: `“${meeting.title}” görüşmesi kabul edildi.`,
            type: "meeting_updated",
            link: `/takvim/${id}`,
          }),
        ),
      );
    }
    return { success: true, data: null };
  } catch (error) {
    return failure(error, "updateMeetingStatus");
  }
}

export async function backfillJitsiMeeting(id: string, allowAdmin = false): Promise<Result<Meeting>> {
  const userId = auth.currentUser?.uid;
  if (!userId) return { success: false, error: { message: "Oturum gerekli." } };
  try {
    const reference = doc(db, "meetings", id);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) return { success: false, error: { message: "Toplantı bulunamadı." } };
    const meeting = mapMeeting(snapshot);
    if (meeting.meetingType !== "online" || meeting.meetingLink) return { success: true, data: meeting };
    if (!allowAdmin && meeting.organizerId !== userId) return { success: false, error: { message: "Bağlantıyı yalnızca organizatör hazırlayabilir." } };
    const meetingRoomId = createSecureMeetingRoomId();
    const meetingLink = createJitsiMeetingLink(meetingRoomId);
    await setDoc(reference, { meetingType: "online", meetingProvider: "jitsi", meetingRoomId, meetingLink, updatedAt: serverTimestamp() }, { merge: true });
    return { success: true, data: { ...meeting, meetingProvider: "jitsi", meetingRoomId, meetingLink } };
  } catch (error) {
    return failure(error, "backfillJitsiMeeting");
  }
}

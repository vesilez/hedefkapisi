import "client-only";

import { isAdminRole, isUserRole, type UserRole } from "@/constants/roles";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import {
  getFirebaseErrorCode,
  getFirebaseErrorMessage,
} from "@/lib/firebase/firebase-error";
import { chatMessageContentSchema } from "@/lib/validations/chat-schema";
import { createNotification } from "@/services/notification-service";
import { grantAchievementInTransaction } from "@/services/achievement-service";
import type { Chat, ChatMessage } from "@/types/chat";
import {
  collection,
  doc,
  FieldPath,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { z } from "zod";

export type ChatServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

const timestampSchema = z.unknown().transform((value, context) => {
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  context.addIssue({ code: "custom", message: "Geçersiz sohbet tarihi." });
  return z.NEVER;
});

const chatSchema = z.object({
  id: z.string().min(1),
  supportRequestId: z.string().min(1),
  ideaId: z.string().min(1),
  ideaTitle: z.string().min(1),
  ownerId: z.string().min(1),
  supporterId: z.string().min(1),
  participantIds: z.array(z.string().min(1)).length(2),
  participantRoles: z.record(z.string(), z.enum(["student", "supporter", "mentor", "sponsor"])),
  mentorshipId: z.string().nullable().default(null),
  type: z.enum(["support", "mentorship", "sponsorship"]),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  lastMessage: z.string().nullable(),
  lastMessageAt: z.union([timestampSchema, z.null()]),
  unreadCounts: z.record(z.string(), z.number().int().nonnegative()),
});

const messageSchema = z.object({
  id: z.string().min(1),
  senderId: z.string().min(1),
  text: z.string().min(1).max(2000),
  createdAt: timestampSchema,
  readBy: z.array(z.string().min(1)),
  status: z.literal("sent"),
});

function failure<T>(
  error: unknown,
  operation = "unknown",
  path: string | null = null,
): ChatServiceResult<T> {
  const code = getFirebaseErrorCode(error) ?? "chat/unknown";
  const rawMessage = error instanceof Error ? error.message : String(error);
  console.error("[chat-service] Firebase operation failed", {
    operation,
    path,
    authUid: auth.currentUser?.uid ?? null,
    code,
    message: rawMessage,
    firebaseError: error,
  });
  return {
    success: false,
    error: {
      code,
      message: `${operation}: ${getFirebaseErrorMessage(error)} (${code}: ${rawMessage})`,
    },
  };
}

function messageFailure<T>(message: string): ChatServiceResult<T> {
  return { success: false, error: { code: "chat/invalid-state", message } };
}

function parseChat(
  snapshot:
    QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>,
): ChatServiceResult<Chat> {
  const parsed = chatSchema.safeParse({
    ...snapshot.data(),
    id: snapshot.id,
  });
  if (!parsed.success) {
    console.error("[chat-service] invalid chat", {
      documentId: snapshot.id,
      issues: parsed.error.issues,
    });
    return messageFailure("Sohbet bilgileri okunamadı.");
  }
  return { success: true, data: parsed.data };
}

async function getCurrentRole(userId: string): Promise<UserRole | null> {
  const profile = await getDoc(doc(db, "users", userId));
  const role: unknown = profile.exists() ? profile.data().role : null;
  return isUserRole(role) ? role : null;
}

async function authorizeChatRead(
  chatId: string,
  userId: string,
): Promise<ChatServiceResult<{ chat: Chat; role: UserRole }>> {
  if (!userId || auth.currentUser?.uid !== userId) {
    return messageFailure("Sohbet için oturum açmalısın.");
  }

  try {
    const [chatSnapshot, role] = await Promise.all([
      getDoc(doc(db, "conversations", chatId)),
      getCurrentRole(userId),
    ]);
    if (!chatSnapshot.exists() || !role) {
      return messageFailure("Sohbet bulunamadı.");
    }
    const parsed = parseChat(chatSnapshot);
    if (!parsed.success) return parsed;
    if (!parsed.data.participantIds.includes(userId) && !isAdminRole(role)) {
      return messageFailure("Bu sohbeti görüntüleme yetkin yok.");
    }
    return { success: true, data: { chat: parsed.data, role } };
  } catch (error: unknown) {
    return failure(error, "getConversation", `conversations/${chatId}`);
  }
}

export function subscribeToChats(
  userId: string,
  role: UserRole,
  listener: (result: ChatServiceResult<Chat[]>) => void,
): Unsubscribe {
  if (!userId || auth.currentUser?.uid !== userId) {
    listener(messageFailure("Sohbetler için oturum açmalısın."));
    return () => undefined;
  }

  const chatsQuery = isAdminRole(role)
    ? query(collection(db, "conversations"))
    : query(
        collection(db, "conversations"),
        where("participantIds", "array-contains", userId),
      );

  return onSnapshot(
    chatsQuery,
    (snapshots) => {
      const chats: Chat[] = [];
      for (const snapshot of snapshots.docs) {
        const parsed = parseChat(snapshot);
        if (!parsed.success) {
          listener(parsed);
          return;
        }
        if (
          !isAdminRole(role) &&
          !parsed.data.participantIds.includes(userId)
        ) {
          continue;
        }
        chats.push(parsed.data);
      }
      chats.sort((first, second) =>
        (second.lastMessageAt ?? second.updatedAt).localeCompare(
          first.lastMessageAt ?? first.updatedAt,
        ),
      );
      listener({ success: true, data: chats });
    },
    (error: unknown) => {
      const failed = failure<Chat[]>(
        error,
        "getConversations",
        "conversations",
      );
      if (
        role === "sponsor" &&
        getFirebaseErrorCode(error)?.includes("permission-denied")
      ) {
        void loadSponsorConversationsFallback(userId).then(listener);
        return;
      }
      listener(failed);
    },
  );
}

async function loadSponsorConversationsFallback(
  sponsorId: string,
): Promise<ChatServiceResult<Chat[]>> {
  try {
    const requests = await getDocs(
      query(
        collection(db, "supportRequests"),
        where("supporterId", "==", sponsorId),
        where("applicationType", "==", "sponsorship"),
        where("status", "==", "approved"),
      ),
    );
    const conversations = await Promise.all(
      requests.docs.map((request) =>
        getDoc(doc(db, "conversations", `support__${request.id}`)),
      ),
    );
    const parsed: Chat[] = [];
    for (const snapshot of conversations) {
      if (!snapshot.exists()) continue;
      const conversation = parseChat(snapshot);
      if (!conversation.success) return conversation;
      if (conversation.data.participantIds.includes(sponsorId)) {
        parsed.push(conversation.data);
      }
    }
    parsed.sort((first, second) =>
      (second.lastMessageAt ?? second.updatedAt).localeCompare(
        first.lastMessageAt ?? first.updatedAt,
      ),
    );
    console.warn("[chat-service] Sponsor conversation list fallback used", {
      sponsorId,
      approvedRequestCount: requests.size,
      conversationCount: parsed.length,
    });
    return { success: true, data: parsed };
  } catch (error: unknown) {
    return failure(
      error,
      "getSponsorConversationsFallback",
      "supportRequests + conversations",
    );
  }
}

export async function subscribeToChatMessages(
  chatId: string,
  userId: string,
  listener: (result: ChatServiceResult<ChatMessage[]>) => void,
): Promise<Unsubscribe> {
  const authorization = await authorizeChatRead(chatId, userId);
  if (!authorization.success) {
    listener(authorization);
    return () => undefined;
  }

  return onSnapshot(
    query(
      collection(db, "conversations", chatId, "messages"),
      orderBy("createdAt", "desc"),
      limit(100),
    ),
    (snapshots) => {
      const messages: ChatMessage[] = [];
      for (const snapshot of snapshots.docs) {
        const parsed = messageSchema.safeParse({
          ...snapshot.data({ serverTimestamps: "estimate" }),
          id: snapshot.id,
        });
        if (!parsed.success) {
          listener(messageFailure("Mesajlar okunamadı."));
          return;
        }
        messages.push(parsed.data);
      }
      messages.sort((first, second) =>
        first.createdAt.localeCompare(second.createdAt),
      );
      listener({ success: true, data: messages });
    },
    (error: unknown) =>
      listener(
        failure(
          error,
          "getMessages",
          `conversations/${chatId}/messages`,
        ),
      ),
  );
}

export async function markChatMessagesAsRead(
  chatId: string,
  userId: string,
): Promise<ChatServiceResult<void>> {
  const authorization = await authorizeChatRead(chatId, userId);
  if (!authorization.success) return authorization;
  if (isAdminRole(authorization.data.role)) {
    return { success: true, data: undefined };
  }

  try {
    const messages = await getDocs(collection(db, "conversations", chatId, "messages"));
    const unread = messages.docs.filter((message) => {
      const readBy: unknown = message.data().readBy;
      return (
        message.data().senderId !== userId &&
        Array.isArray(readBy) &&
        !readBy.includes(userId)
      );
    });
    if (
      unread.length === 0 &&
      authorization.data.chat.unreadCounts[userId] === 0
    ) {
      return { success: true, data: undefined };
    }

    const batch = writeBatch(db);
    for (const message of unread) {
      const readBy: unknown = message.data().readBy;
      batch.update(message.ref, {
        readBy: Array.isArray(readBy) ? [...readBy, userId] : [userId],
      });
    }
    batch.update(
      doc(db, "conversations", chatId),
      new FieldPath("unreadCounts", userId),
      0,
    );
    await batch.commit();
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error, "markMessagesAsRead", `conversations/${chatId}`);
  }
}

export async function sendChatMessage(
  chatId: string,
  content: string,
): Promise<ChatServiceResult<void>> {
  const validation = chatMessageContentSchema.safeParse(content);
  if (!validation.success) {
    return messageFailure(
      validation.error.issues[0]?.message ?? "Mesaj geçersiz.",
    );
  }
  const senderId = auth.currentUser?.uid;
  if (!senderId)
    return messageFailure("Mesaj göndermek için oturum açmalısın.");

  try {
    const messageReference = doc(collection(db, "conversations", chatId, "messages"));
    const result = await runTransaction(db, async (transaction) => {
      const chatReference = doc(db, "conversations", chatId);
      const userReference = doc(db, "users", senderId);
      const [chatSnapshot, userSnapshot] = await Promise.all([
        transaction.get(chatReference),
        transaction.get(userReference),
      ]);
      if (!chatSnapshot.exists() || !userSnapshot.exists()) {
        throw new Error("chat/not-found");
      }

      const parsedChat = parseChat(chatSnapshot);
      if (!parsedChat.success) throw new Error("chat/invalid");
      const role: unknown = userSnapshot.data().role;
      if (!isUserRole(role) || isAdminRole(role)) {
        throw new Error("chat/read-only");
      }
      if (!parsedChat.data.participantIds.includes(senderId)) {
        throw new Error("chat/forbidden");
      }

      const recipientIds = parsedChat.data.participantIds.filter(
        (participantId) => participantId !== senderId,
      );

      transaction.set(messageReference, {
        id: messageReference.id,
        senderId,
        text: validation.data,
        createdAt: serverTimestamp(),
        readBy: [senderId],
        status: "sent",
      });

      const unreadUpdates = Object.fromEntries(
        recipientIds.map((recipientId) => [
          `unreadCounts.${recipientId}`,
          increment(1),
        ]),
      );
      transaction.update(chatReference, {
        lastMessage: validation.data,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...unreadUpdates,
      });
      grantAchievementInTransaction(
        transaction,
        senderId,
        userSnapshot.data(),
        "first_chat",
      );
      return {
        chat: parsedChat.data,
        recipientIds,
      };
    });

    await Promise.all(
      result.recipientIds.map((recipientId) =>
        createNotification({
          userId: recipientId,
          sourceId: chatId,
          title: "Yeni mesaj",
          message: `"${result.chat.ideaTitle}" görüşmesine yeni bir mesaj geldi.`,
          type: "chat_message",
          targetUrl: `/mesajlar?sohbet=${chatId}`,
        }),
      ),
    );
    return { success: true, data: undefined };
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "chat/read-only") {
        return messageFailure("Yöneticiler sohbetleri yalnızca okuyabilir.");
      }
      if (error.message === "chat/forbidden") {
        return messageFailure("Bu sohbete mesaj gönderme yetkin yok.");
      }
      if (error.message === "chat/not-found") {
        return messageFailure("Sohbet bulunamadı.");
      }
    }
    return failure(error, "sendMessage", `conversations/${chatId}/messages`);
  }
}

export async function backfillApprovedConversations(
  adminId: string,
): Promise<ChatServiceResult<number>> {
  if (!adminId || auth.currentUser?.uid !== adminId) {
    return messageFailure("Backfill için yönetici oturumu gerekli.");
  }
  try {
    const role = await getCurrentRole(adminId);
    if (!role || !isAdminRole(role)) {
      return messageFailure("Backfill için yönetici yetkisi gerekli.");
    }
    const [supportRequests, mentorships] = await Promise.all([
      getDocs(query(collection(db, "supportRequests"), where("status", "==", "approved"))),
      getDocs(query(collection(db, "mentorships"), where("status", "==", "active"))),
    ]);
    const batch = writeBatch(db);
    let created = 0;

    for (const request of supportRequests.docs) {
      const data = request.data();
      const ownerId: unknown = (await getDoc(doc(db, "ideas", data.ideaId))).data()?.studentId;
      if (typeof ownerId !== "string" || typeof data.supporterId !== "string") continue;
      const conversationId = `support__${request.id}`;
      if ((await getDoc(doc(db, "conversations", conversationId))).exists()) continue;
      batch.set(doc(db, "conversations", conversationId), {
        id: conversationId,
        participantIds: [ownerId, data.supporterId],
        participantRoles: { [ownerId]: "student", [data.supporterId]: data.applicantRole },
        ideaId: data.ideaId,
        ideaTitle: "Onaylı destek görüşmesi",
        supportRequestId: request.id,
        mentorshipId: null,
        type: data.applicationType,
        ownerId,
        supporterId: data.supporterId,
        lastMessage: null,
        lastMessageAt: null,
        unreadCounts: { [ownerId]: 0, [data.supporterId]: 0 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      created += 1;
    }

    for (const mentorship of mentorships.docs) {
      const data = mentorship.data();
      if (typeof data.studentId !== "string" || typeof data.mentorId !== "string") continue;
      const conversationId = `mentorship__${mentorship.id}`;
      if ((await getDoc(doc(db, "conversations", conversationId))).exists()) continue;
      batch.set(doc(db, "conversations", conversationId), {
        id: conversationId,
        participantIds: [data.studentId, data.mentorId],
        participantRoles: { [data.studentId]: "student", [data.mentorId]: "mentor" },
        ideaId: mentorship.id,
        ideaTitle: `Mentorluk: ${data.studentName ?? "Öğrenci"}`,
        supportRequestId: mentorship.id,
        mentorshipId: mentorship.id,
        type: "mentorship",
        ownerId: data.studentId,
        supporterId: data.mentorId,
        lastMessage: null,
        lastMessageAt: null,
        unreadCounts: { [data.studentId]: 0, [data.mentorId]: 0 },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      created += 1;
    }
    if (created > 0) await batch.commit();
    return { success: true, data: created };
  } catch (error: unknown) {
    return failure(error, "backfillConversations", "conversations");
  }
}

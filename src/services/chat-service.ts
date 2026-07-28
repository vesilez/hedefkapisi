import "client-only";

import { isAdminRole, isUserRole, type UserRole } from "@/constants/roles";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { getFirebaseErrorMessage } from "@/lib/firebase/firebase-error";
import { chatMessageContentSchema } from "@/lib/validations/chat-schema";
import { createNotification } from "@/services/notification-service";
import type { Chat, ChatMessage } from "@/types/chat";
import {
  collection,
  doc,
  FieldPath,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
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
  | { success: false; error: { message: string } };

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
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  lastMessage: z.string().nullable(),
  lastMessageAt: z.union([timestampSchema, z.null()]),
  unreadCounts: z.record(z.string(), z.number().int().nonnegative()),
});

const messageSchema = z.object({
  id: z.string().min(1),
  chatId: z.string().min(1),
  senderId: z.string().min(1),
  senderName: z.string().min(1),
  content: z.string().min(1).max(2000),
  createdAt: timestampSchema,
  readBy: z.array(z.string().min(1)),
});

function failure<T>(error: unknown): ChatServiceResult<T> {
  return {
    success: false,
    error: { message: getFirebaseErrorMessage(error) },
  };
}

function messageFailure<T>(message: string): ChatServiceResult<T> {
  return { success: false, error: { message } };
}

function parseChat(
  snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>,
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
      getDoc(doc(db, "chats", chatId)),
      getCurrentRole(userId),
    ]);
    if (!chatSnapshot.exists() || !role) {
      return messageFailure("Sohbet bulunamadı.");
    }
    const parsed = parseChat(chatSnapshot);
    if (!parsed.success) return parsed;
    if (
      !parsed.data.participantIds.includes(userId) &&
      !isAdminRole(role)
    ) {
      return messageFailure("Bu sohbeti görüntüleme yetkin yok.");
    }
    return { success: true, data: { chat: parsed.data, role } };
  } catch (error: unknown) {
    return failure(error);
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
    ? query(collection(db, "chats"))
    : query(
        collection(db, "chats"),
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
    (error: unknown) => listener(failure(error)),
  );
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
    collection(db, "chats", chatId, "messages"),
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
    (error: unknown) => listener(failure(error)),
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
    const messages = await getDocs(collection(db, "chats", chatId, "messages"));
    const unread = messages.docs.filter((message) => {
      const readBy: unknown = message.data().readBy;
      return (
        message.data().senderId !== userId &&
        Array.isArray(readBy) &&
        !readBy.includes(userId)
      );
    });
    if (unread.length === 0 && authorization.data.chat.unreadCounts[userId] === 0) {
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
      doc(db, "chats", chatId),
      new FieldPath("unreadCounts", userId),
      0,
    );
    await batch.commit();
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return failure(error);
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
  if (!senderId) return messageFailure("Mesaj göndermek için oturum açmalısın.");

  try {
    const messageReference = doc(collection(db, "chats", chatId, "messages"));
    const result = await runTransaction(db, async (transaction) => {
      const chatReference = doc(db, "chats", chatId);
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

      const name: unknown = userSnapshot.data().name;
      const surname: unknown = userSnapshot.data().surname;
      const senderName =
        [name, surname]
          .filter(
            (value): value is string =>
              typeof value === "string" && value.trim().length > 0,
          )
          .map((value) => value.trim())
          .join(" ") || "Kullanıcı";
      const recipientIds = parsedChat.data.participantIds.filter(
        (participantId) => participantId !== senderId,
      );

      transaction.set(messageReference, {
        id: messageReference.id,
        chatId,
        senderId,
        senderName,
        content: validation.data,
        createdAt: serverTimestamp(),
        readBy: [senderId],
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
      return {
        chat: parsedChat.data,
        senderName,
        recipientIds,
      };
    });

    await Promise.all(
      result.recipientIds.map((recipientId) =>
        createNotification({
          userId: recipientId,
          title: "Yeni mesaj",
          message: `${result.senderName}, "${result.chat.ideaTitle}" sohbetine yeni bir mesaj gönderdi.`,
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
    return failure(error);
  }
}

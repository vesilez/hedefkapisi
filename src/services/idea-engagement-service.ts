import "client-only";

import { IDEA_STAGES } from "@/constants/idea-stages";
import { SUPPORT_TYPES } from "@/constants/support-types";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import {
  getFirebaseErrorCode,
  getFirebaseErrorMessage,
} from "@/lib/firebase/firebase-error";
import { createNotification } from "@/services/notification-service";
import type {
  FavoriteIdeaItem,
  IdeaEngagementState,
} from "@/types/idea-engagement";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { z } from "zod";

export type IdeaEngagementResult<T> =
  { success: true; data: T } | { success: false; error: { message: string } };

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

  context.addIssue({ code: "custom", message: "Geçersiz tarih." });
  return z.NEVER;
});

const favoriteIdeaSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string(),
  shortDescription: z.string(),
  categoryId: z.string(),
  city: z.string().nullable(),
  stage: z.enum(IDEA_STAGES),
  supportNeeds: z.array(z.enum(SUPPORT_TYPES)),
  visibility: z.enum(["public", "anonymous"]),
  isFeatured: z.boolean(),
  supportCount: z.number(),
  likeCount: z.number().int().nonnegative().optional().default(0),
  commentCount: z.number().int().nonnegative().optional().default(0),
  coverImageUrl: z.string().nullable(),
  createdAt: timestampSchema,
});

function failure<T>(error: unknown): IdeaEngagementResult<T> {
  return {
    success: false,
    error: { message: getFirebaseErrorMessage(error) },
  };
}

function logEngagementReadError(
  collectionName: "ideas" | "likes" | "favorites",
  ideaId: string,
  userId: string | null,
  error: unknown,
): void {
  console.error("[idea-engagement] Firestore subscription failed", {
    collection: collectionName,
    ideaId,
    userId,
    code: getFirebaseErrorCode(error) ?? "firestore/unknown",
    message:
      error instanceof Error ? error.message : getFirebaseErrorMessage(error),
    name: error instanceof Error ? error.name : "UnknownError",
    stack: error instanceof Error ? error.stack : undefined,
    error,
  });
}

function logEngagementActionError(
  action: "toggle-like" | "toggle-favorite",
  ideaId: string,
  userId: string,
  error: unknown,
): void {
  console.error("[idea-engagement] Firestore action failed", {
    action,
    ideaId,
    userId,
    code: getFirebaseErrorCode(error) ?? "firestore/unknown",
    message:
      error instanceof Error ? error.message : getFirebaseErrorMessage(error),
    name: error instanceof Error ? error.name : "UnknownError",
    stack: error instanceof Error ? error.stack : undefined,
    error,
  });
}

function isPermissionDenied(error: unknown): boolean {
  const code = getFirebaseErrorCode(error);
  return code === "permission-denied" || code === "firestore/permission-denied";
}

function messageFailure<T>(message: string): IdeaEngagementResult<T> {
  return { success: false, error: { message } };
}

function engagementDocumentId(ideaId: string, userId: string): string {
  return `${ideaId}__${userId}`;
}

export function subscribeToIdeaEngagement(
  ideaId: string,
  userId: string | null,
  listener: (result: IdeaEngagementResult<IdeaEngagementState>) => void,
): Unsubscribe {
  let likeCount = 0;
  let isLiked = false;
  let isFavorite = false;
  let ideaLoaded = false;

  function emit() {
    if (!ideaLoaded) return;
    listener({
      success: true,
      data: { likeCount, isLiked, isFavorite },
    });
  }

  const unsubscribes: Unsubscribe[] = [
    onSnapshot(
      doc(db, "ideas", ideaId),
      (snapshot) => {
        const rawCount: unknown = snapshot.exists()
          ? snapshot.data().likeCount
          : 0;
        likeCount =
          typeof rawCount === "number" && Number.isFinite(rawCount)
            ? Math.max(0, rawCount)
            : 0;
        ideaLoaded = true;
        emit();
      },
      (error: unknown) => {
        logEngagementReadError("ideas", ideaId, userId, error);
        if (isPermissionDenied(error)) {
          ideaLoaded = true;
          emit();
          return;
        }
        listener(failure(error));
      },
    ),
  ];

  if (userId && auth.currentUser?.uid === userId) {
    unsubscribes.push(
      onSnapshot(
        query(
          collection(db, "likes"),
          where("ideaId", "==", ideaId),
          where("userId", "==", userId),
        ),
        (snapshot) => {
          isLiked = !snapshot.empty;
          emit();
        },
        (error: unknown) => {
          logEngagementReadError("likes", ideaId, userId, error);
          if (isPermissionDenied(error)) {
            isLiked = false;
            emit();
            return;
          }
          listener(failure(error));
        },
      ),
      onSnapshot(
        query(
          collection(db, "favorites"),
          where("ideaId", "==", ideaId),
          where("userId", "==", userId),
        ),
        (snapshot) => {
          isFavorite = !snapshot.empty;
          emit();
        },
        (error: unknown) => {
          logEngagementReadError("favorites", ideaId, userId, error);
          if (isPermissionDenied(error)) {
            isFavorite = false;
            emit();
            return;
          }
          listener(failure(error));
        },
      ),
    );
  }

  return () => {
    for (const unsubscribe of unsubscribes) unsubscribe();
  };
}

export async function toggleIdeaLike(
  ideaId: string,
): Promise<IdeaEngagementResult<{ isLiked: boolean; likeCount: number }>> {
  const userId = auth.currentUser?.uid;
  if (!userId) return messageFailure("Beğenmek için giriş yapmalısınız.");

  try {
    const ideaReference = doc(db, "ideas", ideaId);
    const likeReference = doc(
      db,
      "likes",
      engagementDocumentId(ideaId, userId),
    );
    console.info("[idea-engagement] Firestore query", {
      operation: "list",
      collection: "likes",
      path: "likes",
      filters: { ideaId, userId },
    });
    const existingLikes = await getDocs(
      query(
        collection(db, "likes"),
        where("ideaId", "==", ideaId),
        where("userId", "==", userId),
        limit(1),
      ),
    );
    const shouldCreateLike = existingLikes.empty;
    const result = await runTransaction(db, async (transaction) => {
      const idea = await transaction.get(ideaReference);
      if (!idea.exists() || idea.data().status !== "approved") {
        throw new Error("engagement/idea-not-available");
      }
      const ownerId =
        typeof idea.data().studentId === "string" ? idea.data().studentId : "";

      const rawCount: unknown = idea.data().likeCount;
      const currentCount =
        typeof rawCount === "number" && Number.isFinite(rawCount)
          ? Math.max(0, rawCount)
          : 0;
      const isLiked = shouldCreateLike;
      const likeCount = Math.max(0, currentCount + (isLiked ? 1 : -1));

      if (isLiked) {
        const likePayload = {
          id: likeReference.id,
          ideaId,
          userId,
          createdAt: serverTimestamp(),
        };
        console.info("[idea-engagement] Firestore write", {
          operation: "create",
          collection: "likes",
          path: likeReference.path,
          documentId: likeReference.id,
          payload: likePayload,
        });
        transaction.set(likeReference, likePayload);
      } else {
        console.info("[idea-engagement] Firestore write", {
          operation: "delete",
          collection: "likes",
          path: likeReference.path,
          documentId: likeReference.id,
          payload: null,
        });
        transaction.delete(likeReference);
      }
      console.info("[idea-engagement] Firestore write", {
        operation: "update",
        collection: "ideas",
        path: ideaReference.path,
        documentId: ideaReference.id,
        payload: { likeCount },
      });
      transaction.update(ideaReference, { likeCount });
      return {
        isLiked,
        likeCount,
        likeId: likeReference.id,
        ownerId,
        title:
          typeof idea.data().title === "string" ? idea.data().title : "Hayal",
        slug: typeof idea.data().slug === "string" ? idea.data().slug : "",
      };
    });

    if (result.isLiked && result.ownerId && result.ownerId !== userId) {
      const notification = await createNotification({
        userId: result.ownerId,
        sourceId: result.likeId,
        title: "Hayalin beğenildi",
        message: `"${result.title}" başlıklı hayalin beğenildi.`,
        type: "idea_liked",
        link: result.slug ? `/hayaller/${result.slug}` : "/fikirlerim",
      });
      if (!notification.success) {
        console.error(
          "[idea-engagement-service] notification failed:",
          notification.error.message,
        );
      }
    }

    return {
      success: true,
      data: { isLiked: result.isLiked, likeCount: result.likeCount },
    };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "engagement/idea-not-available"
    ) {
      return messageFailure("Beğenilebilecek hayal bulunamadı.");
    }
    logEngagementActionError("toggle-like", ideaId, userId, error);
    return failure(error);
  }
}

export async function toggleIdeaFavorite(
  ideaId: string,
): Promise<IdeaEngagementResult<{ isFavorite: boolean }>> {
  const userId = auth.currentUser?.uid;
  if (!userId)
    return messageFailure("Favorilere eklemek için giriş yapmalısınız.");

  try {
    const ideaReference = doc(db, "ideas", ideaId);
    const favoriteReference = doc(
      db,
      "favorites",
      engagementDocumentId(ideaId, userId),
    );
    console.info("[idea-engagement] Firestore query", {
      operation: "list",
      collection: "favorites",
      path: "favorites",
      filters: { ideaId, userId },
    });
    const existingFavorites = await getDocs(
      query(
        collection(db, "favorites"),
        where("ideaId", "==", ideaId),
        where("userId", "==", userId),
        limit(1),
      ),
    );
    const shouldCreateFavorite = existingFavorites.empty;
    const isFavorite = await runTransaction(db, async (transaction) => {
      const idea = await transaction.get(ideaReference);
      if (!idea.exists() || idea.data().status !== "approved") {
        throw new Error("engagement/idea-not-available");
      }

      if (!shouldCreateFavorite) {
        console.info("[idea-engagement] Firestore write", {
          operation: "delete",
          collection: "favorites",
          path: favoriteReference.path,
          documentId: favoriteReference.id,
          payload: null,
        });
        transaction.delete(favoriteReference);
        return false;
      }

      const favoritePayload = {
        id: favoriteReference.id,
        ideaId,
        userId,
        createdAt: serverTimestamp(),
      };
      console.info("[idea-engagement] Firestore write", {
        operation: "create",
        collection: "favorites",
        path: favoriteReference.path,
        documentId: favoriteReference.id,
        payload: favoritePayload,
      });
      transaction.set(favoriteReference, favoritePayload);
      return true;
    });
    return { success: true, data: { isFavorite } };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "engagement/idea-not-available"
    ) {
      return messageFailure("Favorilere eklenebilecek hayal bulunamadı.");
    }
    logEngagementActionError("toggle-favorite", ideaId, userId, error);
    return failure(error);
  }
}

export async function getFavoriteIdeas(
  userId: string,
): Promise<IdeaEngagementResult<FavoriteIdeaItem[]>> {
  if (!userId || auth.currentUser?.uid !== userId) {
    return messageFailure("Favorileri görüntülemek için giriş yapmalısınız.");
  }

  try {
    const favorites = await getDocs(
      query(collection(db, "favorites"), where("userId", "==", userId)),
    );
    const items = await Promise.all(
      favorites.docs.map(async (favorite): Promise<FavoriteIdeaItem | null> => {
        const ideaId: unknown = favorite.data().ideaId;
        const createdAt = timestampSchema.safeParse(favorite.data().createdAt);
        if (typeof ideaId !== "string" || !createdAt.success) return null;

        const idea = await getDoc(doc(db, "ideas", ideaId));
        if (
          !idea.exists() ||
          idea.data().status !== "approved" ||
          idea.data().visibility === "private"
        ) {
          return null;
        }
        const parsedIdea = favoriteIdeaSchema.safeParse({
          ...idea.data(),
          id: idea.id,
        });
        if (!parsedIdea.success) return null;

        return {
          favoriteId: favorite.id,
          favoritedAt: createdAt.data,
          idea: parsedIdea.data,
        };
      }),
    );

    const visibleItems = items.filter(
      (item): item is FavoriteIdeaItem => item !== null,
    );
    visibleItems.sort((first, second) =>
      second.favoritedAt.localeCompare(first.favoritedAt),
    );
    return { success: true, data: visibleItems };
  } catch (error: unknown) {
    return failure(error);
  }
}

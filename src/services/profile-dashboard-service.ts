import "client-only";

import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { getIdeaCommentsByUser } from "@/services/comment-service";
import { getFavoriteIdeas } from "@/services/idea-engagement-service";
import { getIdeasByStudent } from "@/services/idea-service";
import { getSupportRequestsByUser } from "@/services/support-request-service";
import { getUserProfile } from "@/services/user-service";
import type {
  ProfileCommentActivity,
  ProfileDashboardData,
  ProfileSupportActivity,
} from "@/types/profile-dashboard";
import { doc, getDoc } from "firebase/firestore";

export type ProfileDashboardResult =
  | { success: true; data: ProfileDashboardData }
  | { success: false; error: { message: string } };

function failure(message: string): ProfileDashboardResult {
  return { success: false, error: { message } };
}

export async function getProfileDashboard(
  userId: string,
): Promise<ProfileDashboardResult> {
  if (!userId || auth.currentUser?.uid !== userId) {
    return failure("Profil faaliyetlerini görüntülemek için giriş yapmalısınız.");
  }

  const [profile, ideas, favorites, comments, supportRequests] =
    await Promise.all([
      getUserProfile(userId),
      getIdeasByStudent(userId),
      getFavoriteIdeas(userId),
      getIdeaCommentsByUser(userId),
      getSupportRequestsByUser(userId),
    ]);

  if (!profile.success || !profile.data) {
    return failure(
      profile.success
        ? "Profil kaydınız bulunamadı."
        : profile.error.message,
    );
  }
  if (!ideas.success) return failure(ideas.error.message);
  if (!favorites.success) return failure(favorites.error.message);
  if (!comments.success) return failure(comments.error.message);
  if (!supportRequests.success) {
    return failure(supportRequests.error.message);
  }

  const ideaIds = [
    ...new Set([
      ...comments.data.map((comment) => comment.ideaId),
      ...supportRequests.data.map((request) => request.ideaId),
    ]),
  ];
  const ideaSummaries = new Map<
    string,
    { title: string; slug: string | null }
  >();

  try {
    await Promise.all(
      ideaIds.map(async (ideaId) => {
        const snapshot = await getDoc(doc(db, "ideas", ideaId));
        if (!snapshot.exists()) return;
        const title: unknown = snapshot.data().title;
        const slug: unknown = snapshot.data().slug;
        ideaSummaries.set(ideaId, {
          title:
            typeof title === "string" && title.trim()
              ? title
              : "Hayal bulunamadı",
          slug: typeof slug === "string" && slug.trim() ? slug : null,
        });
      }),
    );
  } catch {
    return failure("Faaliyetlere ait hayal bilgileri yüklenemedi.");
  }

  const commentActivities: ProfileCommentActivity[] = comments.data.map(
    (comment) => {
      const idea = ideaSummaries.get(comment.ideaId);
      return {
        id: comment.id,
        content: comment.content,
        status: comment.status,
        createdAt: comment.createdAt,
        ideaTitle: idea?.title ?? "Hayal bulunamadı",
        ideaSlug: idea?.slug ?? null,
      };
    },
  );
  const supportActivities: ProfileSupportActivity[] =
    supportRequests.data.map((request) => {
      const idea = ideaSummaries.get(request.ideaId);
      return {
        id: request.id,
        supportTypes: request.supportTypes,
        status: request.status,
        adminNote: request.adminNote,
        createdAt: request.createdAt,
        ideaTitle: idea?.title ?? "Hayal bulunamadı",
        ideaSlug: idea?.slug ?? null,
      };
    });

  return {
    success: true,
    data: {
      profile: profile.data,
      ideas: ideas.data,
      favorites: favorites.data,
      comments: commentActivities,
      supportRequests: supportActivities,
      statistics: {
        sharedIdeas: ideas.data.length,
        approvedIdeas: ideas.data.filter((idea) => idea.status === "approved")
          .length,
        favorites: favorites.data.length,
        comments: comments.data.length,
        supportRequests: supportRequests.data.length,
      },
    },
  };
}

import "client-only";

import type { SupportType } from "@/constants/support-types";
import { inferSupportTypes, matchTerms, scoreIdeaMatch } from "@/lib/matching/score-idea-match";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import type { IdeaListItem } from "@/types/idea";
import type { IdeaMatch, MatchRole } from "@/types/matching";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";

type Result<T> = { success: true; data: T } | { success: false; error: { message: string } };


export async function getIdeaMatches(role: MatchRole): Promise<Result<IdeaMatch[]>> {
  const uid = auth.currentUser?.uid;
  if (!uid) return { success: false, error: { message: "Öneriler için giriş yapmalısınız." } };
  try {
    const [userSnapshot, sponsorSnapshot, ideasSnapshot] = await Promise.all([
      getDoc(doc(db, "users", uid)),
      role === "sponsor" ? getDoc(doc(db, "sponsorProfiles", uid)) : Promise.resolve(null),
      getDocs(query(collection(db, "ideas"), where("status", "==", "approved"), limit(100))),
    ]);
    if (!userSnapshot.exists() || userSnapshot.data().role !== role) {
      return { success: false, error: { message: "Bu rol için öneri erişiminiz yok." } };
    }
    const user = userSnapshot.data();
    const sponsor = sponsorSnapshot?.data();
    const profileValues: unknown[] =
      role === "sponsor"
        ? [sponsor?.organizationType, ...(sponsor?.supportAreas ?? [])]
        : role === "mentor"
          ? [...(user.mentorProfile?.expertiseAreas ?? []), ...(user.mentorProfile?.mentoringTopics ?? [])]
          : [...(user.supporterProfile?.expertiseAreas ?? []), ...(user.supporterProfile?.supportTypes ?? [])];
    const preferredSupport =
      role === "supporter"
        ? (user.supporterProfile?.supportTypes ?? [])
        : role === "mentor"
          ? (["mentorship"] as SupportType[])
          : inferSupportTypes(profileValues);
    const city = role === "sponsor" ? sponsor?.city : user.city;
    const matches = ideasSnapshot.docs.flatMap((snapshot) => {
      const data = snapshot.data();
      if (!Array.isArray(data.supportNeeds) || typeof data.title !== "string") return [];
      const idea: IdeaListItem = {
        id: snapshot.id,
        studentId: data.studentId,
        slug: data.slug,
        title: data.title,
        shortDescription: data.shortDescription ?? "",
        categoryId: data.categoryId,
        city: data.city ?? null,
        stage: data.stage,
        supportNeeds: data.supportNeeds,
        visibility: data.visibility,
        isFeatured: data.isFeatured ?? false,
        supportCount: data.supportCount ?? 0,
        likeCount: data.likeCount ?? 0,
        commentCount: data.commentCount ?? 0,
        coverImageUrl: data.coverImageUrl ?? null,
        createdAt: data.createdAt?.toDate?.().toISOString() ?? new Date(0).toISOString(),
      };
      return [scoreIdeaMatch(idea, matchTerms(profileValues), preferredSupport, city ?? "")];
    });
    return { success: true, data: matches.filter((match) => match.score > 0).sort((a, b) => b.score - a.score).slice(0, 8) };
  } catch (error: unknown) {
    console.error("[matching-service] recommendation load failed", { uid, role, error });
    return { success: false, error: { message: "Öneriler şu anda yüklenemiyor." } };
  }
}

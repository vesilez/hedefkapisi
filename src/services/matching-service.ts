import "client-only";

import { isAdminRole } from "@/constants/roles";
import { isSupportType, type SupportType } from "@/constants/support-types";
import { auth } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { inferSupportTypes, matchTerms, scoreIdeaMatch } from "@/lib/matching/score-idea-match";
import type { IdeaListItem } from "@/types/idea";
import type { IdeaMatch, MatchRole, MatchingAnalytics } from "@/types/matching";
import { collection, doc, getDoc, getDocs, limit, query, where, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";

type Result<T> = { success: true; data: T } | { success: false; error: { message: string } };

function mapIdea(snapshot: QueryDocumentSnapshot<DocumentData>): IdeaListItem | null {
  const data = snapshot.data();
  if (!Array.isArray(data.supportNeeds) || typeof data.title !== "string" || typeof data.slug !== "string") return null;
  const supportNeeds = data.supportNeeds.filter(isSupportType);
  return {
    id: snapshot.id, studentId: data.studentId, slug: data.slug, title: data.title,
    shortDescription: data.shortDescription ?? "", tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : [],
    categoryId: data.categoryId, city: data.city ?? null, stage: data.stage, supportNeeds,
    visibility: data.visibility, isFeatured: data.isFeatured ?? false, supportCount: data.supportCount ?? 0,
    likeCount: data.likeCount ?? 0, commentCount: data.commentCount ?? 0, coverImageUrl: data.coverImageUrl ?? null,
    createdAt: data.createdAt?.toDate?.().toISOString() ?? new Date(0).toISOString(),
  };
}

function profileInputs(role: MatchRole, user: DocumentData, sponsor?: DocumentData) {
  const interests: unknown[] = role === "sponsor"
    ? [sponsor?.organizationType, ...(sponsor?.supportAreas ?? [])]
    : role === "mentor"
      ? [...(user.mentorProfile?.mentoringTopics ?? []), user.mentorProfile?.profession]
      : [...(user.supporterProfile?.supportTypes ?? []), user.supporterProfile?.bio];
  const expertise: unknown[] = role === "sponsor"
    ? [...(sponsor?.supportAreas ?? [])]
    : role === "mentor"
      ? [...(user.mentorProfile?.expertiseAreas ?? [])]
      : [...(user.supporterProfile?.expertiseAreas ?? [])];
  const preferredSupport: SupportType[] = role === "supporter"
    ? (user.supporterProfile?.supportTypes ?? []).filter(isSupportType)
    : role === "mentor" ? ["mentorship"] : inferSupportTypes([...interests, ...expertise]);
  return { interestTerms: matchTerms(interests), expertiseTerms: matchTerms(expertise), preferredSupport, city: role === "sponsor" ? sponsor?.city ?? "" : user.city ?? "" };
}

function rankIdeas(ideas: IdeaListItem[], inputs: ReturnType<typeof profileInputs>, excluded = new Set<string>()): IdeaMatch[] {
  return ideas.filter((idea) => !excluded.has(idea.id)).map((idea) => scoreIdeaMatch(idea, inputs.interestTerms, inputs.preferredSupport, inputs.city, inputs.expertiseTerms)).filter((match) => match.score > 0).sort((a, b) => b.score - a.score || b.idea.createdAt.localeCompare(a.idea.createdAt)).slice(0, 10);
}

async function approvedVisibleIdeas(): Promise<IdeaListItem[]> {
  const snapshots = await getDocs(query(collection(db, "ideas"), where("status", "==", "approved"), where("visibility", "in", ["public", "anonymous"]), limit(100)));
  return snapshots.docs.flatMap((snapshot) => { const idea = mapIdea(snapshot); return idea ? [idea] : []; });
}

export async function getIdeaMatches(role: MatchRole): Promise<Result<IdeaMatch[]>> {
  const uid = auth.currentUser?.uid;
  if (!uid) return { success: false, error: { message: "Öneriler için giriş yapmalısınız." } };
  try {
    const [userSnapshot, sponsorSnapshot, ideas, requestsSnapshot, supportsSnapshot] = await Promise.all([
      getDoc(doc(db, "users", uid)),
      role === "sponsor" ? getDoc(doc(db, "sponsorProfiles", uid)) : Promise.resolve(null),
      approvedVisibleIdeas(),
      getDocs(query(collection(db, "supportRequests"), where("supporterId", "==", uid), where("status", "in", ["pending", "approved"]), limit(200))),
      role === "sponsor" ? getDocs(query(collection(db, "sponsorSupports"), where("sponsorId", "==", uid), limit(200))) : Promise.resolve(null),
    ]);
    if (!userSnapshot.exists() || userSnapshot.data().role !== role) return { success: false, error: { message: "Bu rol için öneri erişiminiz yok." } };
    const excluded = new Set<string>();
    requestsSnapshot.docs.forEach((request) => { const ideaId = request.data().ideaId; if (typeof ideaId === "string") excluded.add(ideaId); });
    supportsSnapshot?.docs.forEach((support) => { const ideaId = support.data().ideaId; if (typeof ideaId === "string") excluded.add(ideaId); });
    return { success: true, data: rankIdeas(ideas, profileInputs(role, userSnapshot.data(), sponsorSnapshot?.data()), excluded) };
  } catch (error) {
    console.error("[matching-service] recommendation load failed", { uid, role, error });
    return { success: false, error: { message: "Öneriler şu anda yüklenemiyor." } };
  }
}

export async function getMatchingAnalytics(adminId: string): Promise<Result<MatchingAnalytics>> {
  if (auth.currentUser?.uid !== adminId) return { success: false, error: { message: "Yönetici oturumu gerekli." } };
  try {
    const admin = await getDoc(doc(db, "users", adminId));
    if (!admin.exists() || !isAdminRole(admin.data().role)) return { success: false, error: { message: "Yönetici yetkisi gerekli." } };
    const [users, sponsors, ideas] = await Promise.all([
      getDocs(query(collection(db, "users"), where("role", "in", ["sponsor", "mentor", "supporter"]), limit(500))),
      getDocs(query(collection(db, "sponsorProfiles"), limit(500))),
      approvedVisibleIdeas(),
    ]);
    const sponsorMap = new Map(sponsors.docs.map((item) => [item.id, item.data()]));
    const roleScores: Record<MatchRole, number[]> = { sponsor: [], mentor: [], supporter: [] };
    const categories = new Map<string, number>();
    for (const user of users.docs) {
      const role = user.data().role as MatchRole;
      const matches = rankIdeas(ideas, profileInputs(role, user.data(), sponsorMap.get(user.id)));
      matches.forEach((match) => { roleScores[role].push(match.score); categories.set(match.idea.categoryId, (categories.get(match.idea.categoryId) ?? 0) + 1); });
    }
    const byRole = (Object.keys(roleScores) as MatchRole[]).map((role) => ({ role, recommendationCount: roleScores[role].length, averageScore: roleScores[role].length ? Math.round(roleScores[role].reduce((sum, score) => sum + score, 0) / roleScores[role].length) : 0 }));
    return { success: true, data: { byRole, topCategories: [...categories].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([categoryId, count]) => ({ categoryId, count })) } };
  } catch (error) {
    console.error("[matching-service] analytics load failed", { adminId, error });
    return { success: false, error: { message: "Eşleştirme analizi yüklenemedi." } };
  }
}

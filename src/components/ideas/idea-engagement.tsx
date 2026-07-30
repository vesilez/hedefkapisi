"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  subscribeToIdeaEngagement,
  toggleIdeaFavorite,
  toggleIdeaLike,
} from "@/services/idea-engagement-service";
import type { IdeaEngagementState } from "@/types/idea-engagement";
import { Bookmark, Check, Heart, LoaderCircle, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface IdeaEngagementProps {
  ideaId: string;
  initialLikeCount: number;
  ideaTitle: string;
}

export function IdeaEngagement({
  ideaId,
  initialLikeCount,
  ideaTitle,
}: IdeaEngagementProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<IdeaEngagementState>({
    likeCount: initialLikeCount,
    isLiked: false,
    isFavorite: false,
  });
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"like" | "favorite" | null>(null);
  const [shared, setShared] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    return subscribeToIdeaEngagement(ideaId, user?.id ?? null, (result) => {
      if (result.success) {
        setState(result.data);
        setFeedback((current) => (current?.type === "error" ? null : current));
      }
      setLoading(false);
    });
  }, [ideaId, user?.id]);

  function requireUser(): boolean {
    if (!authLoading && !user) {
      router.push("/giris");
      return false;
    }
    return Boolean(user);
  }

  async function toggleLike() {
    if (action || !requireUser()) return;

    console.info("[idea-engagement-ui] Like button clicked", {
      ideaId,
      userId: user?.id ?? null,
      currentIsLiked: state.isLiked,
    });
    setAction("like");
    setFeedback(null);

    const result = await toggleIdeaLike(ideaId);
    if (result.success) {
      setState((current) => ({
        ...current,
        isLiked: result.data.isLiked,
        likeCount: result.data.likeCount,
      }));
      setFeedback({
        type: "success",
        message: result.data.isLiked
          ? "Hayal beğenildi."
          : "Beğeni geri alındı.",
      });
    } else {
      setFeedback({ type: "error", message: result.error.message });
    }
    setAction(null);
  }

  async function toggleFavorite() {
    if (action || !requireUser()) return;

    console.info("[idea-engagement-ui] Favorite button clicked", {
      ideaId,
      userId: user?.id ?? null,
      currentIsFavorite: state.isFavorite,
    });
    setAction("favorite");
    setFeedback(null);

    const result = await toggleIdeaFavorite(ideaId);
    if (result.success) {
      setState((current) => ({
        ...current,
        isFavorite: result.data.isFavorite,
      }));
      setFeedback({
        type: "success",
        message: result.data.isFavorite
          ? "Hayal favorilere eklendi."
          : "Hayal favorilerden çıkarıldı.",
      });
    } else {
      setFeedback({ type: "error", message: result.error.message });
    }
    setAction(null);
  }

  async function shareIdea() {
    const shareData = {
      title: ideaTitle,
      text: `${ideaTitle} hayalini Hedef Kapısı'nda incele.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 2200);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback({
        type: "error",
        message: "Paylaşım bağlantısı oluşturulamadı.",
      });
    }
  }

  return (
    <div className="mt-7" translate="no">
      <div
        className="grid gap-2 sm:flex sm:flex-wrap"
        aria-label="Hayal etkileşimleri"
      >
        <Button
          variant={state.isLiked ? "primary" : "secondary"}
          className="w-full shadow-sm sm:w-auto"
          disabled={loading || authLoading || Boolean(action)}
          aria-pressed={state.isLiked}
          aria-label={`${state.likeCount} beğeni. ${
            state.isLiked ? "Beğeniyi geri al" : "Hayali beğen"
          }`}
          onClick={() => void toggleLike()}
        >
          <span className="relative size-4 shrink-0" aria-hidden="true">
            <Heart
              className={`absolute inset-0 size-4 ${
                state.isLiked ? "fill-current" : ""
              } ${action === "like" ? "invisible" : "visible"}`}
            />
            <LoaderCircle
              className={`absolute inset-0 size-4 animate-spin ${
                action === "like" ? "visible" : "invisible"
              }`}
            />
          </span>
          <span>
            <span>{state.likeCount}</span> <span>Beğeni</span>
          </span>
        </Button>
        <Button
          variant={state.isFavorite ? "primary" : "secondary"}
          className="w-full shadow-sm sm:w-auto"
          disabled={loading || authLoading || Boolean(action)}
          aria-pressed={state.isFavorite}
          aria-label={
            state.isFavorite
              ? "Hayali favorilerden çıkar"
              : "Hayali favorilere ekle"
          }
          onClick={() => void toggleFavorite()}
        >
          <span className="relative size-4 shrink-0" aria-hidden="true">
            <Bookmark
              className={`absolute inset-0 size-4 ${
                state.isFavorite ? "fill-current" : ""
              } ${action === "favorite" ? "invisible" : "visible"}`}
            />
            <LoaderCircle
              className={`absolute inset-0 size-4 animate-spin ${
                action === "favorite" ? "visible" : "invisible"
              }`}
            />
          </span>
          <span>{state.isFavorite ? "Favorilerimde" : "Favoriye Ekle"}</span>
        </Button>
        <Button
          variant="secondary"
          className="w-full shadow-sm sm:w-auto"
          aria-label="Hayali paylaş"
          onClick={() => void shareIdea()}
        >
          <span className="relative size-4 shrink-0" aria-hidden="true">
            <Share2
              className={`absolute inset-0 size-4 ${
                shared ? "invisible" : "visible"
              }`}
            />
            <Check
              className={`absolute inset-0 size-4 text-emerald-700 ${
                shared ? "visible" : "invisible"
              }`}
            />
          </span>
          <span>{shared ? "Bağlantı Kopyalandı" : "Paylaş"}</span>
        </Button>
      </div>
      <p
        className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium ${
          feedback === null
            ? "hidden"
            : feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
        }`}
        role={feedback?.type === "error" ? "alert" : "status"}
        aria-live={feedback?.type === "error" ? "assertive" : "polite"}
      >
        <span>{feedback?.message ?? ""}</span>
      </p>
    </div>
  );
}

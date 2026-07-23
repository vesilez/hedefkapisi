"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  subscribeToIdeaEngagement,
  toggleIdeaFavorite,
  toggleIdeaLike,
} from "@/services/idea-engagement-service";
import type { IdeaEngagementState } from "@/types/idea-engagement";
import { Bookmark, Heart, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface IdeaEngagementProps {
  ideaId: string;
  initialLikeCount: number;
}

export function IdeaEngagement({
  ideaId,
  initialLikeCount,
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
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    return subscribeToIdeaEngagement(
      ideaId,
      user?.id ?? null,
      (result) => {
        if (result.success) {
          setState(result.data);
          setFeedback((current) =>
            current?.type === "error" ? null : current,
          );
        } else {
          setFeedback({ type: "error", message: result.error.message });
        }
        setLoading(false);
      },
    );
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

    setAction("like");
    setFeedback(null);
    const previous = state;
    const optimisticLiked = !state.isLiked;
    setState({
      ...state,
      isLiked: optimisticLiked,
      likeCount: Math.max(0, state.likeCount + (optimisticLiked ? 1 : -1)),
    });

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
      setState(previous);
      setFeedback({ type: "error", message: result.error.message });
    }
    setAction(null);
  }

  async function toggleFavorite() {
    if (action || !requireUser()) return;

    setAction("favorite");
    setFeedback(null);
    const previous = state;
    setState({ ...state, isFavorite: !state.isFavorite });

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
      setState(previous);
      setFeedback({ type: "error", message: result.error.message });
    }
    setAction(null);
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <Button
          variant={state.isLiked ? "primary" : "secondary"}
          disabled={loading || authLoading || Boolean(action)}
          aria-pressed={state.isLiked}
          onClick={() => void toggleLike()}
        >
          {action === "like" ? (
            <LoaderCircle
              aria-hidden="true"
              className="mr-2 size-4 animate-spin"
            />
          ) : (
            <Heart
              aria-hidden="true"
              className={`mr-2 size-4 ${state.isLiked ? "fill-current" : ""}`}
            />
          )}
          {state.likeCount} Beğeni
        </Button>
        <Button
          variant={state.isFavorite ? "primary" : "secondary"}
          disabled={loading || authLoading || Boolean(action)}
          aria-pressed={state.isFavorite}
          onClick={() => void toggleFavorite()}
        >
          {action === "favorite" ? (
            <LoaderCircle
              aria-hidden="true"
              className="mr-2 size-4 animate-spin"
            />
          ) : (
            <Bookmark
              aria-hidden="true"
              className={`mr-2 size-4 ${
                state.isFavorite ? "fill-current" : ""
              }`}
            />
          )}
          {state.isFavorite ? "Favorilerimde" : "Favoriye Ekle"}
        </Button>
      </div>
      {feedback && (
        <p
          className={`mt-3 text-sm font-medium ${
            feedback.type === "success" ? "text-emerald-700" : "text-red-700"
          }`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { getFavoriteIdeas } from "@/services/idea-engagement-service";
import type { FavoriteIdeaItem } from "@/types/idea-engagement";
import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IdeaCard } from "./idea-card";

type ViewState = "loading" | "ready" | "error";

export function FavoriteIdeas() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<ViewState>("loading");
  const [items, setItems] = useState<FavoriteIdeaItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load(userId: string) {
    setState("loading");
    setError(null);
    const result = await getFavoriteIdeas(userId);
    if (result.success) {
      setItems(result.data);
      setState("ready");
    } else {
      setError(result.error.message);
      setState("error");
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/giris");
      return;
    }

    let active = true;
    void getFavoriteIdeas(user.id).then((result) => {
      if (!active) return;
      if (result.success) {
        setItems(result.data);
        setState("ready");
      } else {
        setError(result.error.message);
        setState("error");
      }
    });
    return () => {
      active = false;
    };
  }, [authLoading, router, user]);

  if (authLoading || state === "loading") {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-2xl bg-white">
        <LoadingSpinner label="Favoriler yükleniyor..." />
      </div>
    );
  }

  if (!user) return null;

  if (state === "error") {
    return (
      <div
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
        role="alert"
      >
        <p className="font-semibold text-red-800">
          {error ?? "Favoriler şu anda yüklenemiyor."}
        </p>
        <Button className="mt-4" onClick={() => void load(user.id)}>
          Tekrar Dene
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Henüz favorin yok"
        description="Beğendiğin hayalleri favorilerine ekleyerek burada saklayabilirsin."
        icon={Bookmark}
      />
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <IdeaCard key={item.favoriteId} idea={item.idea} />
      ))}
    </div>
  );
}

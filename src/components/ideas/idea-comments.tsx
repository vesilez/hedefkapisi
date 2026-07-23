"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Textarea } from "@/components/ui/textarea";
import { isAdminRole, USER_ROLE_LABELS, type UserRole } from "@/constants/roles";
import { useAuth } from "@/hooks/use-auth";
import {
  createIdeaComment,
  deleteIdeaComment,
  hideIdeaComment,
  subscribeToIdeaComments,
  updateIdeaComment,
} from "@/services/comment-service";
import { getUserAccessProfile } from "@/services/user-service";
import type { IdeaComment } from "@/types/comment";
import { LoaderCircle, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface IdeaCommentsProps {
  ideaId: string;
}

interface Feedback {
  type: "success" | "error";
  message: string;
}

export function IdeaComments({ ideaId }: IdeaCommentsProps) {
  const { user, loading: authLoading } = useAuth();
  const [viewerRole, setViewerRole] = useState<UserRole | null>(null);
  const [comments, setComments] = useState<IdeaComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    let active = true;
    void getUserAccessProfile(user.id).then((result) => {
      if (!active) return;
      setViewerRole(result.success ? (result.data?.role ?? null) : null);
    });
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  useEffect(() => {
    return subscribeToIdeaComments(ideaId, viewerRole, (result) => {
      if (result.success) {
        setComments(result.data);
        setFeedback((current) =>
          current?.type === "error" ? null : current,
        );
      } else {
        setFeedback({ type: "error", message: result.error.message });
      }
      setCommentsLoading(false);
    });
  }, [ideaId, viewerRole]);

  async function submitComment() {
    if (!user || submitting) return;

    setSubmitting(true);
    setFeedback(null);
    const result = await createIdeaComment(ideaId, content);
    if (result.success) {
      setComments((current) => [
        result.data,
        ...current.filter((comment) => comment.id !== result.data.id),
      ]);
      setContent("");
      setFeedback({ type: "success", message: "Yorumunuz eklendi." });
    } else {
      setFeedback({ type: "error", message: result.error.message });
    }
    setSubmitting(false);
  }

  return (
    <section className="mt-9" aria-labelledby="comments-title">
      <Card className="p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <MessageCircle aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 id="comments-title" className="text-2xl font-bold text-slate-950">
              Yorumlar
            </h2>
            <p className="text-sm text-slate-500">
              {comments.length} yorum
            </p>
          </div>
        </div>

        {!authLoading && user ? (
          <div className="mt-6">
            <label
              htmlFor={`new-comment-${ideaId}`}
              className="text-sm font-semibold text-slate-800"
            >
              Yorum yaz
            </label>
            <Textarea
              id={`new-comment-${ideaId}`}
              className="mt-2"
              value={content}
              minLength={2}
              maxLength={1000}
              disabled={submitting}
              placeholder="Düşüncelerini paylaş..."
              onChange={(event) => setContent(event.target.value)}
            />
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                {content.length}/1000
              </span>
              <Button
                disabled={
                  submitting ||
                  content.trim().length < 2 ||
                  content.trim().length > 1000
                }
                onClick={() => void submitComment()}
              >
                {submitting && (
                  <LoaderCircle
                    aria-hidden="true"
                    className="mr-2 size-4 animate-spin"
                  />
                )}
                Yorum Gönder
              </Button>
            </div>
          </div>
        ) : !authLoading ? (
          <p className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
            Yorum yapmak için{" "}
            <Link href="/giris" className="font-semibold underline">
              giriş yapmalısın
            </Link>
            .
          </p>
        ) : null}

        {feedback && (
          <p
            className={
              feedback.type === "success"
                ? "mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
                : "mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800"
            }
            role={feedback.type === "error" ? "alert" : "status"}
          >
            {feedback.message}
          </p>
        )}

        <div className="mt-8 border-t border-slate-200 pt-6">
          {commentsLoading ? (
            <div className="flex min-h-32 items-center justify-center">
              <LoadingSpinner label="Yorumlar yükleniyor..." />
            </div>
          ) : comments.length === 0 ? (
            <EmptyState
              title="Henüz yorum yok"
              description="Bu hayal hakkındaki ilk yorumu sen paylaşabilirsin."
              icon={MessageCircle}
            />
          ) : (
            <div className="grid gap-4">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.id ?? null}
                  viewerRole={viewerRole}
                  onUpdated={(commentId, nextContent, updatedAt) =>
                    setComments((current) =>
                      current.map((item) =>
                        item.id === commentId
                          ? { ...item, content: nextContent, updatedAt }
                          : item,
                      ),
                    )
                  }
                  onRemoved={(commentId) =>
                    setComments((current) =>
                      current.filter((item) => item.id !== commentId),
                    )
                  }
                  onHidden={(commentId) =>
                    setComments((current) =>
                      current.map((item) =>
                        item.id === commentId
                          ? { ...item, status: "hidden" }
                          : item,
                      ),
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}

interface CommentItemProps {
  comment: IdeaComment;
  currentUserId: string | null;
  viewerRole: UserRole | null;
  onUpdated: (commentId: string, content: string, updatedAt: string) => void;
  onRemoved: (commentId: string) => void;
  onHidden: (commentId: string) => void;
}

function CommentItem({
  comment,
  currentUserId,
  viewerRole,
  onUpdated,
  onRemoved,
  onHidden,
}: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [action, setAction] = useState<"edit" | "delete" | "hide" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const isOwner = currentUserId === comment.userId;
  const isAdmin = isAdminRole(viewerRole);

  async function saveEdit() {
    if (action) return;
    setAction("edit");
    setError(null);
    const result = await updateIdeaComment(comment.id, draft);
    if (result.success) {
      onUpdated(comment.id, result.data.content, result.data.updatedAt);
      setEditing(false);
    } else {
      setError(result.error.message);
    }
    setAction(null);
  }

  async function remove() {
    if (action) return;
    if (!window.confirm("Bu yorumu silmek istediğine emin misin?")) return;

    setAction("delete");
    setError(null);
    const result = await deleteIdeaComment(comment.id);
    if (result.success) onRemoved(comment.id);
    else setError(result.error.message);
    setAction(null);
  }

  async function hide() {
    if (action || comment.status === "hidden") return;
    setAction("hide");
    setError(null);
    const result = await hideIdeaComment(comment.id);
    if (result.success) onHidden(comment.id);
    else setError(result.error.message);
    setAction(null);
  }

  return (
    <article
      className={`rounded-xl border p-4 sm:p-5 ${
        comment.status === "hidden"
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">{comment.userName}</h3>
            <Badge className="bg-white text-slate-700">
              {USER_ROLE_LABELS[comment.userRole]}
            </Badge>
            {comment.status === "hidden" && (
              <Badge className="bg-amber-100 text-amber-800">Gizli</Badge>
            )}
          </div>
          <time className="mt-1 block text-xs text-slate-500">
            {new Intl.DateTimeFormat("tr-TR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(comment.createdAt))}
            {comment.updatedAt !== comment.createdAt && " · Düzenlendi"}
          </time>
        </div>
      </div>

      {editing ? (
        <div className="mt-4">
          <Textarea
            value={draft}
            minLength={2}
            maxLength={1000}
            disabled={action === "edit"}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              disabled={
                action === "edit" ||
                draft.trim().length < 2 ||
                draft.trim().length > 1000
              }
              onClick={() => void saveEdit()}
            >
              {action === "edit" && (
                <LoaderCircle
                  aria-hidden="true"
                  className="mr-2 size-4 animate-spin"
                />
              )}
              Kaydet
            </Button>
            <Button
              variant="ghost"
              disabled={action === "edit"}
              onClick={() => {
                setDraft(comment.content);
                setEditing(false);
                setError(null);
              }}
            >
              Vazgeç
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">
          {comment.content}
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {!editing && (isOwner || isAdmin) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {isOwner && (
            <Button
              variant="ghost"
              className="min-h-9 px-3 py-1.5 text-xs"
              disabled={Boolean(action)}
              onClick={() => setEditing(true)}
            >
              Düzenle
            </Button>
          )}
          {(isOwner || isAdmin) && (
            <Button
              variant="ghost"
              className="min-h-9 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
              disabled={Boolean(action)}
              onClick={() => void remove()}
            >
              {action === "delete" ? "Siliniyor..." : "Sil"}
            </Button>
          )}
          {isAdmin && comment.status !== "hidden" && (
            <Button
              variant="secondary"
              className="min-h-9 px-3 py-1.5 text-xs"
              disabled={Boolean(action)}
              onClick={() => void hide()}
            >
              {action === "hide" ? "Gizleniyor..." : "Gizle"}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

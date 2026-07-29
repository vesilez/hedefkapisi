"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Textarea } from "@/components/ui/textarea";
import { isAdminRole, type UserRole } from "@/constants/roles";
import { useAuth } from "@/hooks/use-auth";
import {
  markChatMessagesAsRead,
  sendChatMessage,
  subscribeToChatMessages,
  subscribeToChats,
} from "@/services/chat-service";
import { getUserAccessProfile } from "@/services/user-service";
import type { Chat, ChatMessage } from "@/types/chat";
import {
  ArrowLeft,
  Circle,
  LoaderCircle,
  MessageCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

type PageState = "loading" | "ready" | "error";

function formatChatDate(value: string | null): string {
  if (!value) return "Yeni sohbet";
  const date = new Date(value);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isToday) {
    return new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
  if (date.toDateString() === yesterday.toDateString()) return "Dün";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMessageDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
  }).format(new Date(value));
}

export function ChatDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedChatId = searchParams.get("sohbet");
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [state, setState] = useState<PageState>("loading");
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(
    Boolean(requestedChatId),
  );
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/giris");
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let active = true;
    void getUserAccessProfile(user.id).then((profileResult) => {
      if (!active) return;
      if (!profileResult.success || !profileResult.data) {
        setError("Kullanıcı yetkileri okunamadı.");
        setState("error");
        return;
      }
      setRole(profileResult.data.role);
      unsubscribe = subscribeToChats(
        user.id,
        profileResult.data.role,
        (result) => {
          if (!active) return;
          if (result.success) {
            setChats(result.data);
            setError(null);
            setState("ready");
          } else {
            setError(result.error.message);
            setState("error");
          }
        },
      );
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [authLoading, router, user]);

  const activeChatId = requestedChatId ?? selectedChatId;

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [activeChatId, chats],
  );
  const totalUnread = useMemo(
    () =>
      user
        ? chats.reduce(
            (total, chat) => total + (chat.unreadCounts[user.id] ?? 0),
            0,
          )
        : 0,
    [chats, user],
  );

  useEffect(() => {
    if (!user || !activeChatId || !selectedChat) return;

    let active = true;
    let unsubscribe: (() => void) | undefined;
    void subscribeToChatMessages(activeChatId, user.id, (result) => {
      if (!active) return;
      if (result.success) {
        setMessages(result.data);
        setError(null);
      } else {
        setError(result.error.message);
      }
      setMessagesLoading(false);
    }).then((nextUnsubscribe) => {
      if (!active) {
        nextUnsubscribe();
        return;
      }
      unsubscribe = nextUnsubscribe;
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [activeChatId, selectedChat, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedChat && !isAdminRole(role)) {
      composerRef.current?.focus({ preventScroll: true });
    }
  }, [role, selectedChat]);

  useEffect(() => {
    if (
      !user ||
      !selectedChat ||
      isAdminRole(role) ||
      (selectedChat.unreadCounts[user.id] ?? 0) === 0
    ) {
      return;
    }
    void markChatMessagesAsRead(selectedChat.id, user.id);
  }, [messages, role, selectedChat, user]);

  function selectChat(chatId: string) {
    setSelectedChatId(chatId);
    setMessages([]);
    setMessagesLoading(true);
    setError(null);
    window.history.pushState(null, "", `/mesajlar?sohbet=${chatId}`);
  }

  function closeMobileChat() {
    setSelectedChatId(null);
    setMessages([]);
    setMessagesLoading(false);
    window.history.pushState(null, "", "/mesajlar");
  }

  async function submitMessage() {
    if (!selectedChat || sending || !content.trim()) return;
    setSending(true);
    setError(null);
    const result = await sendChatMessage(selectedChat.id, content);
    if (result.success) {
      setContent("");
    } else {
      setError(result.error.message);
    }
    setSending(false);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  }

  if (authLoading || state === "loading") {
    return (
      <div className="mx-auto min-h-[70dvh] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex min-h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <LoadingSpinner label="Sohbetler yükleniyor..." />
        </div>
      </div>
    );
  }
  if (!user) return null;

  if (state === "error" && chats.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800"
          role="alert"
        >
          {error ?? "Sohbetler yüklenemedi."}
        </div>
      </div>
    );
  }

  const requestedChatForbidden =
    Boolean(requestedChatId) &&
    state === "ready" &&
    !chats.some((chat) => chat.id === requestedChatId);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
          Mesajlar
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Onaylanan destek başvurularındaki özel görüşmelerin.
        </p>
      </div>

      {requestedChatForbidden && (
        <p
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
          role="alert"
        >
          Bu sohbeti görüntüleme yetkin yok veya sohbet bulunamadı.
        </p>
      )}

      <div className="grid h-[clamp(34rem,68dvh,48rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside
          className={`min-h-0 lg:border-r lg:border-slate-200 ${
            selectedChat ? "hidden lg:flex" : "flex"
          } flex-col`}
          aria-label="Sohbet listesi"
        >
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-4">
            <div>
              <h2 className="font-bold text-slate-950">Sohbetlerim</h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <Circle
                  aria-hidden="true"
                  className="size-2 fill-emerald-500 text-emerald-500"
                />
                Canlı · {chats.length} görüşme
              </p>
            </div>
            {totalUnread > 0 && (
              <span className="rounded-full bg-blue-700 px-2.5 py-1 text-xs font-bold text-white">
                {totalUnread > 99 ? "99+" : totalUnread} yeni
              </span>
            )}
          </div>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {totalUnread > 0
              ? `${totalUnread} okunmamış mesajın var.`
              : "Okunmamış mesajın yok."}
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {chats.length === 0 ? (
              <EmptyState
                className="m-4 py-8"
                title="Henüz sohbetin yok"
                description="Bir destek başvurusu onaylandığında sohbet burada görünecek."
                icon={MessageCircle}
              />
            ) : (
              chats.map((chat) => {
                const unread = chat.unreadCounts[user.id] ?? 0;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    aria-current={activeChatId === chat.id ? "true" : undefined}
                    onClick={() => selectChat(chat.id)}
                    className={`relative flex w-full items-start gap-3 border-b border-slate-100 p-4 text-left hover:bg-slate-50 focus-visible:outline-offset-[-2px] ${
                      activeChatId === chat.id
                        ? "bg-blue-50 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-blue-700"
                        : "bg-white"
                    }`}
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                      {chat.ideaTitle.charAt(0).toLocaleUpperCase("tr-TR")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span
                          className={`line-clamp-1 text-sm text-slate-950 ${
                            unread > 0 ? "font-extrabold" : "font-semibold"
                          }`}
                        >
                          {chat.ideaTitle}
                        </span>
                        <time className="shrink-0 text-[11px] text-slate-500">
                          {formatChatDate(chat.lastMessageAt)}
                        </time>
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span
                          className={`line-clamp-1 min-w-0 flex-1 text-sm ${
                            unread > 0
                              ? "font-semibold text-slate-800"
                              : "text-slate-600"
                          }`}
                        >
                          {chat.lastMessage ?? "Sohbet başlatmaya hazır"}
                        </span>
                        {unread > 0 && (
                          <span
                            className="flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-700 px-1.5 text-[10px] font-bold text-white"
                            aria-label={`${unread} okunmamış mesaj`}
                          >
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section
          className={`${selectedChat ? "flex" : "hidden lg:flex"} min-h-0 flex-col`}
          aria-label="Seçili sohbet"
        >
          {!selectedChat ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                className="w-full max-w-lg"
                title="Bir sohbet seç"
                description="Mesajları görüntülemek için soldaki görüşmelerden birini seç."
                icon={MessageCircle}
              />
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-slate-200 p-4 sm:px-5">
                <button
                  type="button"
                  onClick={closeMobileChat}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 lg:hidden"
                  aria-label="Sohbet listesine dön"
                >
                  <ArrowLeft aria-hidden="true" className="size-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-bold text-slate-950">
                    {selectedChat.ideaTitle}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Özel destek görüşmesi
                  </p>
                </div>
                {isAdminRole(role) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    <ShieldCheck aria-hidden="true" className="size-3.5" />
                    Denetim
                  </span>
                )}
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-5">
                {messagesLoading ? (
                  <LoadingSpinner label="Mesajlar yükleniyor..." />
                ) : messages.length === 0 ? (
                  <EmptyState
                    className="mx-auto mt-8 max-w-lg bg-white"
                    title="Henüz mesaj yok"
                    description={
                      isAdminRole(role)
                        ? "Katılımcılar henüz bu sohbette mesajlaşmadı."
                        : "İlk mesajı göndererek görüşmeyi başlatabilirsin."
                    }
                    icon={MessageCircle}
                  />
                ) : (
                  <div className="space-y-3" aria-live="polite">
                    {messages.map((message, index) => {
                      const isOwn = message.senderId === user.id;
                      const previousMessage = messages[index - 1];
                      const showDate =
                        !previousMessage ||
                        new Date(previousMessage.createdAt).toDateString() !==
                          new Date(message.createdAt).toDateString();
                      return (
                        <div key={message.id}>
                          {showDate && (
                            <div className="my-4 flex items-center gap-3">
                              <span className="h-px flex-1 bg-slate-200" />
                              <time className="text-[11px] font-semibold text-slate-500">
                                {formatMessageDate(message.createdAt)}
                              </time>
                              <span className="h-px flex-1 bg-slate-200" />
                            </div>
                          )}
                          <article
                            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] ${
                                isOwn
                                  ? "rounded-br-md bg-blue-700 text-white"
                                  : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                              }`}
                            >
                              {!isOwn && (
                                <p className="mb-1 text-xs font-bold text-blue-700">
                                  {message.senderName}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                {message.content}
                              </p>
                              <time
                                className={`mt-1 block text-right text-[10px] ${
                                  isOwn ? "text-blue-100" : "text-slate-400"
                                }`}
                              >
                                {formatMessageTime(message.createdAt)}
                              </time>
                            </div>
                          </article>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {isAdminRole(role) ? (
                <div className="border-t border-slate-200 bg-amber-50 p-4 text-center text-sm font-medium text-amber-800">
                  Yöneticiler sohbeti denetim amacıyla yalnızca okuyabilir.
                </div>
              ) : (
                <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
                  {error && (
                    <p
                      className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}
                  <div className="flex items-end gap-2">
                    <Textarea
                      ref={composerRef}
                      value={content}
                      rows={2}
                      maxLength={2000}
                      disabled={sending}
                      aria-label="Mesaj yaz"
                      placeholder="Mesajını yaz..."
                      className="min-h-12 resize-none"
                      onKeyDown={handleComposerKeyDown}
                      onChange={(event) => setContent(event.target.value)}
                    />
                    <Button
                      className="size-12 shrink-0 px-0"
                      disabled={
                        sending ||
                        content.trim().length < 1 ||
                        content.trim().length > 2000
                      }
                      aria-label="Mesajı gönder"
                      onClick={() => void submitMessage()}
                    >
                      {sending ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="size-5 animate-spin"
                        />
                      ) : (
                        <Send aria-hidden="true" className="size-5" />
                      )}
                    </Button>
                  </div>
                  <div className="mt-1.5 flex justify-between gap-3 text-xs text-slate-500">
                    <span>Enter gönderir · Shift+Enter yeni satır</span>
                    <span>{content.length}/2000</span>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

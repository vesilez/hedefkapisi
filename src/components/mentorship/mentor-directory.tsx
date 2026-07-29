"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  createMentorshipRequest,
  getPublicMentors,
} from "@/services/mentorship-service";
import { getUserAccessProfile } from "@/services/user-service";
import type { PublicMentorProfile } from "@/types/mentorship";
import { BriefcaseBusiness, MapPin, Send, UserRoundSearch } from "lucide-react";
import { useEffect, useState } from "react";

export function MentorDirectory() {
  const { user, loading: authLoading } = useAuth();
  const [mentors, setMentors] = useState<PublicMentorProfile[]>([]);
  const [isStudent, setIsStudent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicMentorProfile | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getPublicMentors(),
      user ? getUserAccessProfile(user.id) : Promise.resolve(null),
    ]).then(([mentorResult, accessResult]) => {
      if (!active) return;
      if (mentorResult.success) setMentors(mentorResult.data);
      else setError(mentorResult.error.message);
      setIsStudent(
        Boolean(
          accessResult &&
          accessResult.success &&
          accessResult.data?.role === "student",
        ),
      );
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoadingSpinner label="Mentorlar yükleniyor..." />
      </div>
    );
  }
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 text-center">
        <p className="font-semibold text-red-800" role="alert">
          {error}
        </p>
      </Card>
    );
  }
  if (mentors.length === 0) {
    return (
      <EmptyState
        title="Henüz görünür mentor profili yok"
        description="Mentorlar profil bilgilerini tamamladığında burada görünecek."
        icon={UserRoundSearch}
      />
    );
  }

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {mentors.map((mentor) => (
          <Card key={mentor.mentorId} className="flex h-full flex-col">
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-blue-100 bg-cover bg-center text-lg font-black text-blue-800"
                style={
                  mentor.avatarUrl
                    ? { backgroundImage: `url("${mentor.avatarUrl}")` }
                    : undefined
                }
              >
                {!mentor.avatarUrl &&
                  `${mentor.name.charAt(0)}${mentor.surname.charAt(0)}`}
              </span>
              <div className="min-w-0">
                <h2 className="break-words text-xl font-bold text-slate-950">
                  {mentor.name} {mentor.surname}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                  <BriefcaseBusiness aria-hidden="true" className="size-4" />
                  {mentor.profession}
                  {mentor.organization ? ` · ${mentor.organization}` : ""}
                </p>
                {mentor.city && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin aria-hidden="true" className="size-4" />
                    {mentor.city}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-4 line-clamp-4 leading-7 text-slate-600">
              {mentor.biography}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {mentor.expertiseAreas.map((area) => (
                <Badge key={area}>{area}</Badge>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-600">
              <strong>Uygunluk:</strong> {mentor.availability}
            </p>
            {isStudent && mentor.mentorId !== user?.id && (
              <Button
                className="mt-auto pt-3"
                onClick={() => setSelected(mentor)}
              >
                <Send aria-hidden="true" className="size-4" />
                Mentorluk Talebi Gönder
              </Button>
            )}
          </Card>
        ))}
      </div>
      {selected && (
        <MentorshipRequestDialog
          mentor={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function MentorshipRequestDialog({
  mentor,
  onClose,
}: {
  mentor: PublicMentorProfile;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setFeedback(null);
    const result = await createMentorshipRequest({
      mentorId: mentor.mentorId,
      message,
      focusAreas,
    });
    if (result.success) {
      setFeedback("Talebin mentora gönderildi.");
      setMessage("");
      setFocusAreas([]);
    } else {
      setFeedback(result.error.message);
    }
    setSubmitting(false);
  }

  const topics =
    mentor.mentoringTopics.length > 0
      ? mentor.mentoringTopics
      : mentor.expertiseAreas;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mentorship-request-title"
    >
      <Card className="max-h-[90dvh] w-full max-w-xl overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="mentorship-request-title"
              className="text-xl font-bold text-slate-950"
            >
              {mentor.name} {mentor.surname} için talep
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Hangi konularda destek istediğini açıkça paylaş.
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Kapat
          </Button>
        </div>
        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-slate-800">
            Odak alanları
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {topics.map((topic) => (
              <label
                key={topic}
                className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={focusAreas.includes(topic)}
                  onChange={(event) =>
                    setFocusAreas((current) =>
                      event.target.checked
                        ? [...current, topic]
                        : current.filter((item) => item !== topic),
                    )
                  }
                />
                {topic}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="mt-5 block text-sm font-semibold text-slate-800">
          Talep mesajı
          <Textarea
            className="mt-2"
            value={message}
            maxLength={1500}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Hedeflerini ve mentordan beklentini anlat..."
          />
        </label>
        {feedback && (
          <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
            {feedback}
          </p>
        )}
        <Button
          className="mt-5 w-full"
          disabled={
            submitting || message.trim().length < 20 || focusAreas.length === 0
          }
          onClick={() => void submit()}
        >
          {submitting ? "Gönderiliyor..." : "Talebi Gönder"}
        </Button>
      </Card>
    </div>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { getStudentMentorships } from "@/services/mentorship-service";
import type { Mentorship } from "@/types/mentorship";
import { MessageCircle, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function StudentMentorshipSummary() {
  const { user } = useAuth();
  const [active, setActive] = useState<Mentorship | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    void getStudentMentorships(user.id).then((result) => {
      if (mounted && result.success) {
        setActive(
          result.data.find((mentorship) => mentorship.status === "active") ??
            null,
        );
      }
    });
    return () => {
      mounted = false;
    };
  }, [user]);

  if (!active) return null;
  return (
    <Card className="mt-6 border-blue-200 bg-blue-50">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserRoundCheck aria-hidden="true" className="size-7 text-blue-700" />
          <div>
            <p className="text-sm font-semibold text-blue-700">Mentorun</p>
            <h2 className="text-xl font-bold text-slate-950">
              {active.mentorName}
            </h2>
          </div>
        </div>
        <Badge className="bg-emerald-100 text-emerald-800">
          Aktif mentorluk
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {active.focusAreas.map((area) => (
          <Badge key={area}>{area}</Badge>
        ))}
      </div>
      {active.chatId && (
        <Link
          href={`/mesajlar?sohbet=${active.chatId}`}
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
        >
          <MessageCircle aria-hidden="true" className="size-4" />
          Mentorunla Mesajlaş
        </Link>
      )}
    </Card>
  );
}

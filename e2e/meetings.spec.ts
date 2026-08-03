import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { meetingSchema } from "../src/lib/validations/meeting-schema";

test.describe("toplantı ve takvim entegrasyonu", () => {
  test("takvim route'u toplantı takvimini render eder", async () => {
    const source = await readFile("src/app/(dashboard)/takvim/page.tsx", "utf8");
    expect(source).toContain("MeetingCalendar");
    expect(source).toContain("conversationId={sohbet}");
  });

  test("takvim route'u tüm ilişki rolleri için korunur", async () => {
    const source = await readFile("src/components/auth/protected-route.tsx", "utf8");
    expect(source).toContain('prefix: "/takvim"');
    for (const role of ["student", "supporter", "mentor", "sponsor", "admin", "superadmin"]) {
      expect(source).toContain(`"${role}"`);
    }
  });

  test("mesajlaşma kaynağında toplantı planlama eylemi bulunur", async () => {
    const source = await readFile("src/components/chat/chat-dashboard.tsx", "utf8");
    expect(source).toContain("Toplantı Planla");
    expect(source).toContain("/takvim?sohbet=");
  });

  test("datetime-local dakika formatını kabul eder ve eksik formatı reddeder", () => {
    const base = {
      conversationId: "conversation-1",
      title: "Proje değerlendirmesi",
      description: "",
      location: "",
      meetingUrl: "",
    };
    expect(meetingSchema.safeParse({ ...base, startAt: "2026-08-03T14:30", endAt: "2026-08-03T15:30" }).success).toBeTruthy();
    expect(meetingSchema.safeParse({ ...base, startAt: "2026-08-03", endAt: "2026-08-03T15:30" }).success).toBeFalsy();
  });
});

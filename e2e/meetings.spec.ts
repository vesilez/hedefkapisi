import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { meetingSchema } from "../src/lib/validations/meeting-schema";
import { createJitsiMeetingLink, createSecureMeetingRoomId, getMeetingJoinAvailability } from "../src/lib/meetings/jitsi";
import type { Meeting } from "../src/types/meeting";

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

  test("online toplantı için güvenli ve benzersiz Jitsi odası üretir", () => {
    const first = createSecureMeetingRoomId();
    const second = createSecureMeetingRoomId();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^hedef-kapisi-[a-f0-9]{64}$/);
    expect(createJitsiMeetingLink(first)).toBe(`https://meet.jit.si/${first}`);
  });

  test("pending toplantıda katılım kapalı, accepted zaman penceresinde açıktır", () => {
    const now = new Date("2026-08-04T12:00:00.000Z");
    const meeting: Meeting = {
      id: "meeting-1", conversationId: "conversation-1", ideaId: "idea-1", title: "Görüşme", description: "", participantIds: ["user-1", "user-2"], organizerId: "user-1",
      startAt: "2026-08-04T12:10:00.000Z", endAt: "2026-08-04T13:00:00.000Z", location: null, meetingType: "online", meetingProvider: "jitsi", meetingRoomId: "hedef-kapisi-123", meetingLink: "https://meet.jit.si/hedef-kapisi-123", meetingUrl: null, status: "pending", createdAt: now.toISOString(), updatedAt: now.toISOString(),
    };
    expect(getMeetingJoinAvailability(meeting, "user-2", now).enabled).toBeFalsy();
    expect(getMeetingJoinAvailability({ ...meeting, status: "accepted" }, "user-2", now).enabled).toBeTruthy();
  });

  test("yetkisiz kullanıcı toplantı bağlantısını kullanamaz", () => {
    const now = new Date("2026-08-04T12:00:00.000Z");
    const meeting = {
      id: "meeting-1", conversationId: "conversation-1", ideaId: "idea-1", title: "Görüşme", description: "", participantIds: ["user-1", "user-2"], organizerId: "user-1", startAt: "2026-08-04T12:00:00.000Z", endAt: "2026-08-04T13:00:00.000Z", location: null, meetingType: "online", meetingProvider: "jitsi", meetingRoomId: "room", meetingLink: "https://meet.jit.si/room", meetingUrl: null, status: "accepted", createdAt: now.toISOString(), updatedAt: now.toISOString(),
    } satisfies Meeting;
    expect(getMeetingJoinAvailability(meeting, "outsider", now).enabled).toBeFalsy();
  });
});

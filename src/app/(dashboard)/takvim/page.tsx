import { MeetingCalendar } from "@/components/meetings";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({ title: "Takvim", description: "Planlanan destek görüşmelerin.", path: "/takvim", noIndex: true });

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ sohbet?: string }> }) {
  const { sohbet } = await searchParams;
  return <MeetingCalendar conversationId={sohbet} />;
}

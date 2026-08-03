import { MeetingDetail } from "@/components/meetings";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({ title: "Toplantı Detayı", description: "Planlanan toplantının ayrıntıları.", path: "/takvim", noIndex: true });

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingDetail meetingId={id} />;
}

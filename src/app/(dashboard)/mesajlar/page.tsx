import { ChatDashboard } from "@/components/chat/chat-dashboard";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Mesajlar",
  description: "Onaylanan destek başvurularındaki özel görüşmelerin.",
  path: "/mesajlar",
  noIndex: true,
});

export default function MessagesPage() {
  return <ChatDashboard />;
}

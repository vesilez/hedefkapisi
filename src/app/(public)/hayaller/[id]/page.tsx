import { PlaceholderPage } from "@/components/layout/placeholder-page";
export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PlaceholderPage
      title="Hayal Detayı"
      description={`“${id}” kimlikli hayalin ayrıntıları ve destek seçenekleri burada yer alacak.`}
    />
  );
}

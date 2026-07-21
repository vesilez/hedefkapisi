import { MyIdeas } from "@/components/ideas";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Fikirlerim | Hedef Kapısı" },
  description: "Paylaştığın fikirleri ve değerlendirme durumlarını takip et.",
};

export default function MyIdeasPage() {
  return <MyIdeas />;
}

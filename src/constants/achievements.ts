export const ACHIEVEMENT_IDS = [
  "first_dream",
  "first_like",
  "first_support",
  "first_chat",
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: "first_dream",
    title: "İlk Hayalini Paylaştın",
    description: "İlk hayalini toplulukla paylaşarak yolculuğuna başladın.",
  },
  {
    id: "first_like",
    title: "İlk Beğeni",
    description: "Hayallerinden biri topluluktan ilk beğenisini aldı.",
  },
  {
    id: "first_support",
    title: "İlk Destek",
    description: "İlk destek başvurun onaylandı ve bir hayale güç kattın.",
  },
  {
    id: "first_chat",
    title: "İlk Sohbet",
    description: "İlk destek görüşmende mesaj göndererek iletişimi başlattın.",
  },
] as const;

export const IDEA_STAGES = [
  "dream",
  "idea",
  "research",
  "prototype",
  "team_building",
  "support_needed",
  "implemented",
  "startup",
  "completed",
] as const;

export type IdeaStage = (typeof IDEA_STAGES)[number];

export const IDEA_STAGE_LABELS = {
  dream: "Hayal",
  idea: "Fikir",
  research: "Araştırma",
  prototype: "Prototip",
  team_building: "Ekip Kurma",
  support_needed: "Destek Arıyor",
  implemented: "Hayata Geçirildi",
  startup: "Girişim",
  completed: "Tamamlandı",
} as const satisfies Record<IdeaStage, string>;

export const IDEA_STAGE_DESCRIPTIONS = {
  dream: "Henüz şekillenmekte olan bir hayal.",
  idea: "Temel yaklaşımı belirlenmiş bir fikir.",
  research: "İhtiyaç ve uygulanabilirlik araştırılıyor.",
  prototype: "İlk çalışan örnek geliştiriliyor.",
  team_building: "Fikri geliştirecek ekip kuruluyor.",
  support_needed: "İlerlemek için destek aranıyor.",
  implemented: "Fikir uygulanmış ve kullanılmaya başlanmış.",
  startup: "Girişim modeline dönüşmüş bir çalışma.",
  completed: "Hedeflenen çalışma tamamlanmış.",
} as const satisfies Record<IdeaStage, string>;

export const IDEA_STAGE_ORDER = {
  dream: 1,
  idea: 2,
  research: 3,
  prototype: 4,
  team_building: 5,
  support_needed: 6,
  implemented: 7,
  startup: 8,
  completed: 9,
} as const satisfies Record<IdeaStage, number>;

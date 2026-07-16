import type { BaseEntity } from "./common";

export interface Category extends BaseEntity {
  slug: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  order: number;
}

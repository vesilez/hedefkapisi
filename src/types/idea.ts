import type { IdeaStage } from "@/constants/idea-stages";
import type { IdeaStatus } from "@/constants/idea-statuses";
import type { SupportType } from "@/constants/support-types";
import type { Category } from "./category";
import type { BaseEntity, EntityId, ISODateString, Nullable } from "./common";
import type { PublicStudentSummary } from "./user";
import type { PublicIdeaSort } from "@/services/idea-filter-service";

export const IDEA_VISIBILITIES = ["public", "anonymous", "private"] as const;
export type IdeaVisibility = (typeof IDEA_VISIBILITIES)[number];
export type IdeaSubmitAction = "draft" | "submit_for_review";

export interface Idea extends BaseEntity {
  studentId: EntityId;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  problem: string;
  solution: string;
  targetAudience: string;
  categoryId: EntityId;
  city: Nullable<string>;
  stage: IdeaStage;
  supportNeeds: SupportType[];
  visibility: IdeaVisibility;
  status: IdeaStatus;
  adminNote: Nullable<string>;
  rejectionReason: Nullable<string>;
  revisionNote: Nullable<string>;
  isFeatured: boolean;
  viewCount: number;
  supportCount: number;
  likeCount: number;
  commentCount: number;
  coverImageUrl: Nullable<string>;
  attachmentUrls: string[];
  prototypeUrl: Nullable<string>;
  githubUrl: Nullable<string>;
  websiteUrl: Nullable<string>;
  publishedAt: Nullable<ISODateString>;
  moderatedBy?: Nullable<EntityId>;
  moderatedAt?: Nullable<ISODateString>;
}

export interface IdeaFormValues {
  title: string;
  shortDescription: string;
  description: string;
  problem: string;
  solution: string;
  targetAudience: string;
  categoryId: EntityId;
  city: Nullable<string>;
  stage: IdeaStage;
  supportNeeds: SupportType[];
  visibility: IdeaVisibility;
  coverImageUrl: Nullable<string>;
  attachmentUrls: string[];
  prototypeUrl: Nullable<string>;
  githubUrl: Nullable<string>;
  websiteUrl: Nullable<string>;
}

export interface IdeaListItem {
  id: EntityId;
  slug: string;
  title: string;
  shortDescription: string;
  categoryId: EntityId;
  city: Nullable<string>;
  stage: IdeaStage;
  supportNeeds: SupportType[];
  visibility: IdeaVisibility;
  isFeatured: boolean;
  supportCount: number;
  likeCount: number;
  commentCount: number;
  coverImageUrl: Nullable<string>;
  createdAt: ISODateString;
}

export interface PublicIdeaDetail {
  id: EntityId;
  studentId: EntityId;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  problem: string;
  solution: string;
  targetAudience: string;
  categoryId: EntityId;
  city: Nullable<string>;
  stage: IdeaStage;
  supportNeeds: SupportType[];
  visibility: Exclude<IdeaVisibility, "private">;
  isFeatured: boolean;
  supportCount: number;
  likeCount: number;
  prototypeUrl: Nullable<string>;
  githubUrl: Nullable<string>;
  websiteUrl: Nullable<string>;
  publishedAt: Nullable<ISODateString>;
  createdAt: ISODateString;
}

export interface PublicIdeaFilters {
  search?: string;
  categoryId?: string;
  city?: string;
  supportType?: SupportType;
  sort?: PublicIdeaSort;
}

export interface IdeaDetail extends Idea {
  category: Category;
  student: Nullable<PublicStudentSummary>;
}

import type { IdeaListItem } from "./idea";

export const SPONSOR_STATUSES = ["pending", "approved", "rejected"] as const;
export type SponsorStatus = (typeof SPONSOR_STATUSES)[number];

export interface SponsorProfile {
  sponsorId: string;
  institutionName: string;
  logoUrl: string | null;
  description: string;
  website: string | null;
  city: string;
  supportAreas: string[];
  status: SponsorStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorSupport {
  id: string;
  sponsorId: string;
  sponsorName: string;
  ideaId: string;
  ideaOwnerId: string;
  ideaTitle: string;
  ideaSlug: string;
  message: string;
  createdAt: string;
}

export interface SponsorIdeaFilters {
  search?: string;
  category?: string;
  city?: string;
  supportArea?: string;
}

export interface SponsorDashboardData {
  profile: SponsorProfile | null;
  ideas: IdeaListItem[];
  supports: SponsorSupport[];
}

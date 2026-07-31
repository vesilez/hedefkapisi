import type { IdeaListItem } from "./idea";
import type { SupportRequest } from "./support-request";

export const SPONSOR_STATUSES = ["pending", "approved", "rejected"] as const;
export type SponsorStatus = (typeof SPONSOR_STATUSES)[number];

export const ORGANIZATION_TYPES = [
  "company",
  "ngo",
  "foundation",
  "public_institution",
  "university",
  "other",
] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export interface RegistrationSponsorProfile {
  organizationName: string;
  organizationType: OrganizationType;
  city: string;
  website: string | null;
  description: string;
  supportAreas: string[];
}

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

export interface SponsorOfferListItem {
  request: SupportRequest;
  ideaTitle: string;
  ideaSlug: string | null;
}

export interface SponsorDashboardStatistics {
  totalOffers: number;
  pendingOffers: number;
  approvedOffers: number;
  totalSupports: number;
}

export interface SponsorDashboardData {
  profile: SponsorProfile | null;
  ideas: IdeaListItem[];
  supports: SponsorSupport[];
  offers: SponsorOfferListItem[];
  statistics: SponsorDashboardStatistics;
}

import type { ISODateString } from "./common";
import type { IdeaListItem } from "./idea";

export interface IdeaLike {
  id: string;
  ideaId: string;
  userId: string;
  createdAt: ISODateString;
}

export interface IdeaFavorite {
  id: string;
  ideaId: string;
  userId: string;
  createdAt: ISODateString;
}

export interface IdeaEngagementState {
  likeCount: number;
  isLiked: boolean;
  isFavorite: boolean;
}

export interface FavoriteIdeaItem {
  favoriteId: string;
  favoritedAt: ISODateString;
  idea: IdeaListItem;
}

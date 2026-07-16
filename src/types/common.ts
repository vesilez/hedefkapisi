export type EntityId = string;
export type ISODateString = string;
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export interface BaseEntity {
  id: EntityId;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ServiceResult<T> {
  success: boolean;
  data: Nullable<T>;
  error: Nullable<string>;
}

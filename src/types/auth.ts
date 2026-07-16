import type { UserRole } from "@/constants/roles";
import type { EntityId, Nullable } from "./common";

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  surname: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ResetPasswordInput {
  email: string;
}

export interface AuthUser {
  id: EntityId;
  email: Nullable<string>;
  emailVerified: boolean;
  displayName: Nullable<string>;
  photoURL: Nullable<string>;
}

export type AuthResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
      };
    };

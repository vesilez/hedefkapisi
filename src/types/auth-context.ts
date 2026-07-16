import type { AuthResult, AuthUser } from "./auth";

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  logout: () => Promise<AuthResult<void>>;
  refreshUser: () => Promise<void>;
}

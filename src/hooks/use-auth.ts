"use client";

import { AuthContext } from "@/components/auth/auth-provider";
import type { AuthContextValue } from "@/types/auth-context";
import { useContext } from "react";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth, AuthProvider içinde kullanılmalıdır.");
  }

  return context;
}

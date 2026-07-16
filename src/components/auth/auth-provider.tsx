"use client";

import { auth } from "@/lib/firebase/auth";
import {
  logout as logoutFromService,
  mapFirebaseUser,
} from "@/services/auth-service";
import type { AuthUser } from "@/types/auth";
import type { AuthContextValue } from "@/types/auth-context";
import { onAuthStateChanged, reload } from "firebase/auth";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          if (!active) return;
          setUser(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
          setLoading(false);
        },
        () => {
          if (!active) return;
          setUser(null);
          setLoading(false);
        },
      );
    } catch {
      queueMicrotask(() => {
        if (!active) return;
        setUser(null);
        setLoading(false);
      });
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const logout = useCallback(async () => {
    const result = await logoutFromService();

    if (result.success) setUser(null);

    return result;
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setUser(null);
      return;
    }

    try {
      await reload(currentUser);

      const refreshedUser = auth.currentUser;
      setUser(refreshedUser ? mapFirebaseUser(refreshedUser) : null);
    } catch {
      // Mevcut oturum bilgisi korunur; hata UI katmanına taşınmaz.
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      isEmailVerified: user?.emailVerified ?? false,
      logout,
      refreshUser,
    }),
    [loading, logout, refreshUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

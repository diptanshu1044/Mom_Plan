"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isHydrated, isAuthenticated, refreshSession, setInitializing } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;

    (async () => {
      setInitializing(true);
      try {
        if (isAuthenticated) {
          await refreshSession();
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, isAuthenticated, refreshSession, setInitializing]);

  return <>{children}</>;
}

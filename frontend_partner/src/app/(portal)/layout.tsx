"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePartnerAuthStore } from "@/store/auth.store";
import { Sidebar } from "@/components/layout/Sidebar";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isHydrated } = usePartnerAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-partner-soft">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-partner animate-pulse" />
          <div className="text-text-soft text-sm">Loading portal…</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

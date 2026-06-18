"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isHydrated, isInitializing, updateUser } = useAuthStore();
  const router = useRouter();
  const profileEnabled = isHydrated && !isInitializing && isAuthenticated;
  const { data: profile } = useUserProfile(profileEnabled);

  useEffect(() => {
    if (!isHydrated || isInitializing) return;

    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isHydrated, isInitializing, isAuthenticated, router]);

  useEffect(() => {
    if (profile) {
      updateUser(profile);
    }
  }, [profile, updateUser]);

  if (!isHydrated || isInitializing || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-surface-container-low/40">
      <DashboardSidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

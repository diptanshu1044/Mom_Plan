"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPageClient() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/profile");
  }, [router]);

  return (
    <div className="animate-pulse h-40 bg-surface-container rounded-xl" aria-hidden />
  );
}

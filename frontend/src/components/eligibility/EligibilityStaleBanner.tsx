"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface EligibilityStaleBannerProps {
  variant?: "banner" | "compact";
  onRescanNow?: () => void;
  showActions?: boolean;
}

export function EligibilityStaleBanner({
  variant = "banner",
  onRescanNow,
  showActions = true,
}: EligibilityStaleBannerProps) {
  const message =
    "Your profile information has changed since your last eligibility scan. Your benefit results may be outdated.";

  if (variant === "compact") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Results May Be Outdated
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-950">Profile Updated – Rescan Recommended</p>
            <p className="mt-1 text-amber-800">{message}</p>
          </div>
        </div>
        {showActions && (
          <div className="flex shrink-0 gap-2">
            {onRescanNow ? (
              <Button size="sm" onClick={onRescanNow}>
                Rescan Now
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/eligibility?rescan=1">Rescan Now</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserLocationDefaults } from "@/hooks/useUserLocationDefaults";

interface ProfileLocationDisplayProps {
  location: UserLocationDefaults;
  className?: string;
  showHelper?: boolean;
}

export function ProfileLocationDisplay({
  location,
  className,
  showHelper = true,
}: ProfileLocationDisplayProps) {
  const hasLocation =
    Boolean(location.zip_code.trim()) &&
    Boolean(location.state.trim()) &&
    Boolean(location.city.trim());

  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 space-y-3",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
        <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
        Location
      </div>

      {hasLocation ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs font-medium text-on-surface-variant">ZIP</dt>
            <dd className="font-medium text-on-surface">{location.zip_code}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-on-surface-variant">State</dt>
            <dd className="font-medium text-on-surface">{location.state}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-on-surface-variant">City</dt>
            <dd className="font-medium text-on-surface">{location.city}</dd>
          </div>
          {location.county.trim() && (
            <div>
              <dt className="text-xs font-medium text-on-surface-variant">County</dt>
              <dd className="font-medium text-on-surface">{location.county}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="text-sm text-amber-700">
          Your profile is missing location details.{" "}
          <Link href="/dashboard/profile" className="font-semibold underline hover:text-amber-800">
            Add your ZIP code in Profile
          </Link>{" "}
          before running a benefits scan.
        </p>
      )}

      {showHelper && hasLocation && (
        <p className="text-xs text-on-surface-variant">
          Location information is managed from your{" "}
          <Link href="/dashboard/profile" className="text-primary-600 font-semibold hover:underline">
            Profile
          </Link>{" "}
          page. To change your ZIP code, update it in Profile and run the eligibility scan again.
        </p>
      )}
    </div>
  );
}

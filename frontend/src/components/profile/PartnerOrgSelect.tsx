"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export interface PartnerOrgOption {
  id: string;
  name: string;
  type?: string | null;
  tagline?: string | null;
  city?: string | null;
  state?: string | null;
  service_area?: string | null;
}

interface PartnerOrgSelectProps {
  value: string;
  onChange: (orgId: string) => void;
  onOrgTypeChange?: (orgType: string) => void;
  error?: string;
  required?: boolean;
}

export function PartnerOrgSelect({
  value,
  onChange,
  onOrgTypeChange,
  error,
  required,
}: PartnerOrgSelectProps) {
  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: () =>
      api.get("/api/organizations").then((r) => r.data.data as PartnerOrgOption[]),
    staleTime: 5 * 60 * 1000,
  });

  const syncOrgType = (orgId: string) => {
    if (!onOrgTypeChange) return;
    const org = orgs.find((o) => o.id === orgId);
    onOrgTypeChange(org?.type || "");
  };

  useEffect(() => {
    if (!value || orgs.length === 0) return;
    syncOrgType(value);
  }, [value, orgs]);

  const handleChange = (orgId: string) => {
    onChange(orgId);
    syncOrgType(orgId);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-on-surface">
        Partner Organization {required && <span className="text-red-500">*</span>}
      </label>
      <p className="text-xs text-on-surface-variant mb-2">
        {required
          ? "Choose the community organization that will support your benefits applications."
          : "Optional — choose a community organization to support your benefits applications."}
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-on-surface-variant py-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading organizations…
        </div>
      ) : orgs.length === 0 ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No partner organizations are available yet. Please try again later.
        </p>
      ) : (
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          <select
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              error ? "border-red-400" : "border-outline-variant/60"
            }`}
          >
            <option value="">Select an organization…</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
                {[org.city, org.state].filter(Boolean).length
                  ? ` — ${[org.city, org.state].filter(Boolean).join(", ")}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {value && (
        <p className="text-xs text-on-surface-variant">
          {orgs.find((o) => o.id === value)?.tagline ||
            orgs.find((o) => o.id === value)?.service_area ||
            "Your caseworker at this organization will see your profile in their portal."}
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

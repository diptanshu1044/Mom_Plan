"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { SearchableSelect } from "@/components/ui/searchable-select";

export interface ExistingOrgOption {
  id: string;
  name: string;
  type?: string | null;
  tagline?: string | null;
  description?: string | null;
  city?: string | null;
  state?: string | null;
  service_area?: string | null;
}

export interface ExistingOrgLocationFilters {
  state?: string;
  city?: string;
  county?: string;
}

interface ExistingOrgSelectProps {
  value: string;
  onChange: (orgId: string, org: ExistingOrgOption | null) => void;
  locationFilters: ExistingOrgLocationFilters;
  error?: string;
}

function buildOrganizationsUrl(filters: ExistingOrgLocationFilters): string {
  const params = new URLSearchParams();
  if (filters.state?.trim()) params.set("state", filters.state.trim());
  if (filters.city?.trim()) params.set("city", filters.city.trim());
  if (filters.county?.trim()) params.set("county", filters.county.trim());
  const qs = params.toString();
  return qs ? `/api/organizations?${qs}` : "/api/organizations";
}

function locationReady(filters: ExistingOrgLocationFilters): boolean {
  return Boolean(filters.state?.trim() && filters.city?.trim() && filters.county?.trim());
}

export function ExistingOrgSelect({
  value,
  onChange,
  locationFilters,
  error,
}: ExistingOrgSelectProps) {
  const canFetch = locationReady(locationFilters);

  const { data: orgs = [], isLoading, isFetched } = useQuery({
    queryKey: ["signup-organizations", locationFilters],
    queryFn: () =>
      api
        .get(buildOrganizationsUrl(locationFilters))
        .then((response) => response.data.data as ExistingOrgOption[]),
    staleTime: 5 * 60 * 1000,
    enabled: canFetch,
  });

  const handleChange = (orgId: string) => {
    if (!orgId) {
      onChange("", null);
      return;
    }
    const org = orgs.find((entry) => entry.id === orgId) ?? null;
    onChange(orgId, org);
  };

  const options = orgs.map((org) => ({
    value: org.id,
    label: `${org.name}${
      [org.city, org.state].filter(Boolean).length
        ? ` — ${[org.city, org.state].filter(Boolean).join(", ")}`
        : ""
    }`,
  }));

  const selectedOrg = orgs.find((org) => org.id === value);

  return (
    <div className="space-y-1.5">
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-text-soft py-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Loading organizations in your county…
        </div>
      ) : isFetched && orgs.length === 0 ? (
        <p className="text-sm text-text-mid bg-primary-subtle border border-surface-border rounded-xl px-3 py-2.5">
          No organizations are listed for this county yet. Enter your organization details below to register a new one.
        </p>
      ) : orgs.length > 0 ? (
        <>
          <SearchableSelect
            label="Organization"
            placeholder="Select your organization…"
            options={options}
            value={value}
            onChange={handleChange}
            error={error}
            hint="Choose your organization if it is already in our directory."
          />
          {selectedOrg && (
            <p className="text-xs text-text-soft">
              {selectedOrg.tagline ||
                selectedOrg.service_area ||
                "We will link your admin account to this organization."}
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

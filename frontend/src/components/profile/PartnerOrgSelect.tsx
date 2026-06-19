"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Select } from "@/components/ui/Input";

export interface PartnerOrgOption {
  id: string;
  name: string;
  type?: string | null;
  tagline?: string | null;
  city?: string | null;
  state?: string | null;
  service_area?: string | null;
}

export interface PartnerOrgLocationFilters {
  state?: string;
  city?: string;
  county?: string;
}

interface PartnerOrgSelectProps {
  value: string;
  onChange: (orgId: string) => void;
  onOrgTypeChange?: (orgType: string) => void;
  /** Saved org from profile — kept visible even when not in the location-filtered list. */
  selectedOrg?: PartnerOrgOption | null;
  error?: string;
  required?: boolean;
  locationFilters?: PartnerOrgLocationFilters;
  requireLocation?: boolean;
}

function buildOrganizationsUrl(filters?: PartnerOrgLocationFilters): string {
  const params = new URLSearchParams();
  if (filters?.state?.trim()) params.set("state", filters.state.trim());
  if (filters?.city?.trim()) params.set("city", filters.city.trim());
  if (filters?.county?.trim()) params.set("county", filters.county.trim());
  const qs = params.toString();
  return qs ? `/api/organizations?${qs}` : "/api/organizations";
}

function locationFiltersReady(
  filters: PartnerOrgLocationFilters | undefined,
  requireLocation: boolean
): boolean {
  if (!requireLocation) return true;
  return Boolean(
    filters?.state?.trim() && filters?.city?.trim() && filters?.county?.trim()
  );
}

export function PartnerOrgSelect({
  value,
  onChange,
  onOrgTypeChange,
  selectedOrg,
  error,
  required,
  locationFilters,
  requireLocation = false,
}: PartnerOrgSelectProps) {
  const canFetch = locationFiltersReady(locationFilters, requireLocation);

  const { data: orgs = [], isLoading, isFetched } = useQuery({
    queryKey: ["organizations", locationFilters],
    queryFn: () =>
      api
        .get(buildOrganizationsUrl(locationFilters))
        .then((r) => r.data.data as PartnerOrgOption[]),
    staleTime: 5 * 60 * 1000,
    enabled: canFetch,
  });

  const displayOrgs = useMemo(() => {
    const list = [...orgs];
    if (value && selectedOrg?.id === value && !list.some((org) => org.id === value)) {
      list.unshift(selectedOrg);
    }
    return list;
  }, [orgs, selectedOrg, value]);

  const syncOrgType = (orgId: string) => {
    if (!onOrgTypeChange) return;
    const org = displayOrgs.find((o) => o.id === orgId);
    onOrgTypeChange(org?.type || "");
  };

  useEffect(() => {
    if (!value || displayOrgs.length === 0) return;
    syncOrgType(value);
  }, [value, displayOrgs]);

  // Only clear a stale selection after the org list has finished loading.
  useEffect(() => {
    if (!value || !canFetch || isLoading || !isFetched) return;
    if (displayOrgs.some((org) => org.id === value)) return;
    onChange("");
    onOrgTypeChange?.("");
  }, [value, displayOrgs, canFetch, isLoading, isFetched, onChange, onOrgTypeChange]);

  const handleChange = (orgId: string) => {
    onChange(orgId);
    syncOrgType(orgId);
  };

  const hasSavedSelection = Boolean(value && selectedOrg?.id === value);
  const showSelect = displayOrgs.length > 0;

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

      {!canFetch && !hasSavedSelection ? (
        <p className="text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2.5 border border-outline-variant/40">
          Enter your state, city, and county above to see organizations in your area.
        </p>
      ) : canFetch && isLoading && !hasSavedSelection ? (
        <div className="flex items-center gap-2 text-sm text-on-surface-variant py-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading organizations…
        </div>
      ) : canFetch && isFetched && !isLoading && orgs.length === 0 && !hasSavedSelection ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No partner organizations serve your county yet. You can still create your account and check back later.
        </p>
      ) : showSelect ? (
        <Select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          error={error}
          placeholder="Select an organization…"
          allowEmpty
          options={displayOrgs.map((org) => ({
            value: org.id,
            label: `${org.name}${
              [org.city, org.state].filter(Boolean).length
                ? ` — ${[org.city, org.state].filter(Boolean).join(", ")}`
                : ""
            }`,
          }))}
        />
      ) : null}

      {!canFetch && hasSavedSelection && (
        <p className="text-xs text-on-surface-variant">
          Your saved organization is shown above. Enter state, city, and county to browse other options.
        </p>
      )}

      {value && (
        <p className="text-xs text-on-surface-variant">
          {displayOrgs.find((o) => o.id === value)?.tagline ||
            displayOrgs.find((o) => o.id === value)?.service_area ||
            "Your caseworker at this organization will see your profile in their portal."}
        </p>
      )}

    </div>
  );
}

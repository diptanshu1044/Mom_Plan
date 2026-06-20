/** Fields selected from the community organizations table for mother-facing APIs. */
export const organizationPublicSelect = {
  id: true,
  org_name: true,
  org_type: true,
  category: true,
  purpose: true,
  tagline: true,
  description: true,
  website: true,
  email: true,
  contact_email: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  zip_code: true,
  county: true,
  country: true,
  counties_served: true,
  referral_notes: true,
  employees: true,
  founded: true,
  tax_id: true,
  linkedin: true,
} as const;

export type OrganizationPublicRecord = {
  id: string;
  org_name: string;
  org_type: string | null;
  category: string;
  purpose: string | null;
  tagline: string | null;
  description: string | null;
  website: string | null;
  email: string | null;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  county: string | null;
  country: string | null;
  counties_served: string[];
  referral_notes: string | null;
  employees: string | null;
  founded: string | null;
  tax_id: string | null;
  linkedin: string | null;
};

export function toPublicOrganization(org: OrganizationPublicRecord) {
  const serviceArea = org.counties_served.length
    ? org.counties_served.join(', ')
    : org.referral_notes;

  return {
    id: org.id,
    name: org.org_name,
    type: org.category || org.org_type,
    tagline: org.tagline || org.purpose,
    description: org.description || org.purpose,
    website: org.website,
    email: org.contact_email || org.email,
    phone: org.phone,
    address: org.address,
    city: org.city,
    state: org.state,
    zip: org.zip_code,
    county: org.county,
    country: org.country,
    employees: org.employees,
    founded: org.founded,
    tax_id: org.tax_id,
    linkedin: org.linkedin,
    service_area: serviceArea,
  };
}

export function toPublicOrganizationSummary(org: {
  id: string;
  org_name: string;
  city: string | null;
  state: string | null;
}) {
  return {
    id: org.id,
    name: org.org_name,
    city: org.city,
    state: org.state,
  };
}

export function normalizeLocationLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type OrganizationLocationFilters = {
  state?: string;
  city?: string;
  county?: string;
};

/** Whether an org serves the given county (and optional state/city context). */
export function organizationServesLocation(
  org: OrganizationPublicRecord,
  filters: OrganizationLocationFilters
): boolean {
  const county = filters.county?.trim();
  if (!county) return true;

  if (filters.state?.trim()) {
    const orgState = org.state ? normalizeLocationLabel(org.state) : '';
    const userState = normalizeLocationLabel(filters.state);
    if (orgState && orgState !== userState) return false;
  }

  const normalizedCounty = normalizeLocationLabel(county);
  const servedCounties =
    org.counties_served.length > 0
      ? org.counties_served
      : org.county
        ? [org.county]
        : [];

  return servedCounties.some((served) => {
    const normalized = normalizeLocationLabel(served);
    return normalized === normalizedCounty || normalized === 'statewide';
  });
}

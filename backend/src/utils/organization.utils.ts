/** Fields selected from the community organizations table for mother-facing APIs. */
export const organizationPublicSelect = {
  id: true,
  org_name: true,
  org_type: true,
  category: true,
  purpose: true,
  city: true,
  state: true,
  counties_served: true,
  referral_notes: true,
} as const;

export type OrganizationPublicRecord = {
  id: string;
  org_name: string;
  org_type: string | null;
  category: string;
  purpose: string | null;
  city: string | null;
  state: string | null;
  counties_served: string[];
  referral_notes: string | null;
};

export function toPublicOrganization(org: OrganizationPublicRecord) {
  const serviceArea = org.counties_served.length
    ? org.counties_served.join(', ')
    : org.referral_notes;

  return {
    id: org.id,
    name: org.org_name,
    type: org.org_type || org.category,
    tagline: org.purpose,
    description: org.purpose,
    city: org.city,
    state: org.state,
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

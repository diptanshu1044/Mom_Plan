import { OrganizationType } from '@prisma/client';
import { z } from 'zod';

export const ORG_TYPE_LABELS = {
  [OrganizationType.nonprofit_501c3]: 'Non-profit (501c3)',
  [OrganizationType.government_agency]: 'Government Agency',
  [OrganizationType.cooperative]: 'Cooperative',
  [OrganizationType.other]: 'Other',
} as const satisfies Record<OrganizationType, string>;

export const ORG_TYPES = Object.values(ORG_TYPE_LABELS);

export type OrgTypeLabel = (typeof ORG_TYPES)[number];

const labelToOrgType = Object.fromEntries(
  Object.entries(ORG_TYPE_LABELS).map(([enumVal, label]) => [label, enumVal])
) as Record<OrgTypeLabel, OrganizationType>;

export function parseOrgType(value: string): OrganizationType | undefined {
  if ((Object.values(OrganizationType) as string[]).includes(value)) {
    return value as OrganizationType;
  }
  return labelToOrgType[value as OrgTypeLabel];
}

/** Mother-facing org_type is a free-form string (often copied from the selected organization). */
export const orgTypeSchema = z.string().trim().max(200);

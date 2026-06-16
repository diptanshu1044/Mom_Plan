import { z } from 'zod';

export const ORG_TYPES = [
  'Non-profit (501c3)',
  'Government Agency',
  'Cooperative',
  'Other',
] as const;

export type OrgType = (typeof ORG_TYPES)[number];

export const orgTypeSchema = z.enum(ORG_TYPES);

export const ORG_TYPES = [
  "Non-profit (501c3)",
  "Government Agency",
  "Cooperative",
  "Other",
] as const;

export type OrgType = (typeof ORG_TYPES)[number];

export const ORG_TYPE_OPTIONS = ORG_TYPES.map((type) => ({
  value: type,
  label: type,
}));

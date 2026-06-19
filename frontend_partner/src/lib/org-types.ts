/** Display labels for partner organization types (must match backend ORG_TYPE_LABELS). */
export const ORG_TYPES = [
  "211 Network",
  "Childcare Provider",
  "Cooperative",
  "DV Coalition",
  "Education Nonprofit",
  "Emergency Shelter",
  "Faith-Based",
  "Food Bank",
  "Government Agency",
  "Health Clinic",
  "Housing Nonprofit",
  "Immigration Nonprofit",
  "Legal Aid",
  "Non-profit (501c3)",
  "Workforce Development",
  "Wraparound Nonprofit",
  "Other",
] as const;

export type OrgTypeLabel = (typeof ORG_TYPES)[number];

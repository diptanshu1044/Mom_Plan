import { apiDateToIsoLocal } from "@/lib/date-of-birth";
import { formatPhoneForApi, normalizeUsPhoneDigits } from "@/lib/phone";
import type { AuthUser } from "@/store/auth.store";

export interface EligibilitySyncMeta {
  isStale: boolean;
  hasScan: boolean;
  lastProfileUpdateAt: string | null;
  lastEligibilityScanAt: string | null;
}

export interface EligibilityFormData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  ssn_last_four: string;
  phone: string;
  email: string;
  preferred_language: string;
  street_address: string;
  monthly_income: string;
  income_sources: string[];
  employment_status: string;
  employer_name: string;
  other_earners: string;
  savings_assets: string;
  child_support_status: string;
  household_size: number;
  num_children: number;
  children_birthdates: string[];
  has_disability: boolean | null;
  is_pregnant: boolean | null;
  marital_status: string;
  other_adults: boolean | null;
  housing_status: string;
  monthly_rent: string;
  monthly_utilities: string;
  landlord_name: string;
  eviction_risk: boolean | null;
  needs_childcare: boolean | null;
  childcare_preference: string;
  childcare_provider: string;
  monthly_childcare_cost: string;
  work_hours: string[];
  health_insurance: string;
  chronic_illness: boolean | null;
  er_visit: boolean | null;
  immigration_status: string;
  legal_issues: string[];
  urgency: string;
  domestic_violence: boolean | null;
  org_type: string;
  org_id: string;
}

function parseDecimalToString(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && "toJSON" in val && typeof (val as { toJSON: () => unknown }).toJSON === "function") {
    return String((val as { toJSON: () => unknown }).toJSON());
  }
  if (typeof val === "object" && val !== null && "toString" in val) {
    const str = String((val as { toString: () => string }).toString());
    if (!isNaN(Number(str))) return str;
  }
  return "";
}

function normalizeSsnLastFour(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 4);
}

const WORK_HOURS_IDS = new Set([
  "weekdays",
  "evenings",
  "weekends",
  "rotating",
  "varies",
  "not_working",
]);

function parseWorkHours(stored: string | null | undefined): string[] {
  if (!stored) return [];
  return stored.split(",").map((s) => s.trim()).filter((id) => WORK_HOURS_IDS.has(id));
}

export function otherAdultsPossible(householdSize: number, numChildren: number) {
  return householdSize - 1 - numChildren > 0;
}

export function mapOtherEarnersFromProfile(
  otherHouseholdIncome: boolean | null | undefined
): string {
  return otherHouseholdIncome ? "adult" : "none";
}

export function profileToEligibilityForm(user: AuthUser | null): Partial<EligibilityFormData> {
  if (!user) return {};

  const fp = user.family_profile;
  const householdSize = fp?.household_size || 1;
  const numChildren = Math.min(fp?.num_children || 0, Math.max(0, householdSize - 1));
  const initialDobs = [...(fp?.children_dobs || [])].map((dob) => apiDateToIsoLocal(dob));
  while (initialDobs.length < numChildren) initialDobs.push("");

  return {
    first_name: user.first_name || fp?.first_name || "",
    last_name: user.last_name || fp?.last_name || "",
    date_of_birth: apiDateToIsoLocal(fp?.date_of_birth),
    ssn_last_four: normalizeSsnLastFour(fp?.ssn_last_four),
    phone: normalizeUsPhoneDigits(user.phone || fp?.phone || ""),
    email: user.email || fp?.email || "",
    preferred_language: fp?.preferred_language || "English",
    street_address: fp?.street_address || "",
    monthly_income: parseDecimalToString(fp?.monthly_income),
    income_sources: (fp?.income_sources as string[]) || [],
    employment_status: fp?.employment_status || "full_time",
    employer_name: fp?.employer_name || "",
    other_earners: mapOtherEarnersFromProfile(
      typeof fp?.other_household_income === "boolean" ? fp.other_household_income : null
    ),
    savings_assets: fp?.savings_assets || "none",
    child_support_status: fp?.child_support_status || "no_arrangement",
    household_size: householdSize,
    num_children: numChildren,
    children_birthdates: initialDobs.slice(0, numChildren),
    has_disability: numChildren > 0 ? (fp?.has_disability ?? null) : null,
    is_pregnant: fp?.is_pregnant ?? null,
    marital_status: fp?.marital_status || "single",
    other_adults: otherAdultsPossible(householdSize, numChildren)
      ? (fp?.other_adults ?? null)
      : null,
    housing_status: fp?.housing_status || "renting",
    monthly_rent: parseDecimalToString(fp?.monthly_rent),
    monthly_utilities: parseDecimalToString(fp?.monthly_utilities),
    landlord_name: fp?.landlord_name || "",
    eviction_risk: fp?.eviction_risk ?? null,
    needs_childcare: fp?.needs_childcare ?? null,
    childcare_preference: fp?.childcare_preference || "",
    childcare_provider: fp?.childcare_provider || "",
    monthly_childcare_cost: parseDecimalToString(fp?.monthly_childcare_cost),
    work_hours: parseWorkHours(fp?.work_situation),
    health_insurance: fp?.health_insurance || "none",
    chronic_illness: fp?.chronic_illness ?? null,
    er_visit: null,
    immigration_status: fp?.immigration_status || "citizen",
    legal_issues: (fp?.legal_issues as string[]) || [],
    urgency: fp?.urgency || "not_urgent",
    domestic_violence: fp?.domestic_violence ?? null,
    org_type: user.org_type || "",
    org_id: user.org_id || "",
  };
}

export function eligibilityFormToProfilePayload(data: EligibilityFormData) {
  const ages = data.children_birthdates.map((dob) => {
    if (!dob) return 2;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return 2;
    const diff = Date.now() - birth.getTime();
    return Math.max(0, Math.abs(new Date(diff).getUTCFullYear() - 1970));
  });

  return {
    first_name: data.first_name || null,
    last_name: data.last_name || null,
    phone: formatPhoneForApi(data.phone) || undefined,
    email: data.email || undefined,
    street_address: data.street_address || undefined,
    household_size: data.household_size,
    num_children: data.num_children,
    children_ages: ages,
    children_dobs: data.children_birthdates,
    monthly_income: parseFloat(data.monthly_income) || 0,
    employment_status: data.employment_status,
    housing_status: data.housing_status,
    is_pregnant: data.is_pregnant ?? false,
    has_disability: data.has_disability ?? false,
    needs_childcare: data.needs_childcare ?? false,
    monthly_rent: parseFloat(data.monthly_rent) || 0,
    monthly_utilities: parseFloat(data.monthly_utilities) || 0,
    landlord_name: data.landlord_name || undefined,
    eviction_risk: data.eviction_risk ?? false,
    domestic_violence: data.domestic_violence ?? false,
    chronic_illness: data.chronic_illness ?? false,
    immigration_status: data.immigration_status,
    date_of_birth: data.date_of_birth,
    ssn_last_four: normalizeSsnLastFour(data.ssn_last_four) || null,
    preferred_language: data.preferred_language,
    marital_status: data.marital_status,
    other_adults: data.other_adults ?? false,
    other_household_income: data.other_earners !== "none",
    income_sources: data.income_sources,
    work_situation: data.work_hours.length > 0 ? data.work_hours.join(",") : undefined,
    employer_name: data.employer_name || undefined,
    health_insurance: data.health_insurance,
    savings_assets: data.savings_assets,
    child_support_status: data.child_support_status || undefined,
    monthly_childcare_cost: data.needs_childcare
      ? parseFloat(data.monthly_childcare_cost) || 0
      : null,
    childcare_preference: data.childcare_preference || undefined,
    childcare_provider: data.childcare_provider || undefined,
    legal_issues: data.legal_issues,
    urgency: data.urgency,
    org_type: data.org_type || null,
    org_id: data.org_id || null,
  };
}

export const RESCAN_DISMISS_KEY = "momplan_rescan_dismissed_at";

export function isRescanPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const dismissedAt = localStorage.getItem(RESCAN_DISMISS_KEY);
  if (!dismissedAt) return false;
  const dismissedTime = new Date(dismissedAt).getTime();
  if (Number.isNaN(dismissedTime)) return false;
  // Re-prompt after 24 hours
  return Date.now() - dismissedTime < 24 * 60 * 60 * 1000;
}

export function dismissRescanPrompt() {
  if (typeof window !== "undefined") {
    localStorage.setItem(RESCAN_DISMISS_KEY, new Date().toISOString());
  }
}

export function clearRescanDismissal() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(RESCAN_DISMISS_KEY);
  }
}

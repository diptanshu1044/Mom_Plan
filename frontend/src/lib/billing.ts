import { api } from "@/lib/api";

export type OrgPlan = "community" | "partner" | "network";
export type BillingInterval = "monthly" | "yearly";

export interface SubscriptionStatus {
  plan: OrgPlan;
  status: string;
  current_period_end: string | null;
  next_billing_date: string | null;
  renewal_date: string | null;
  cancel_at_period_end: boolean;
}

export const PLAN_PRICING: Record<
  "partner" | "network",
  { monthly: number; yearly: number; yearlyMonthlyEquivalent: number }
> = {
  partner: { monthly: 349, yearly: 3588, yearlyMonthlyEquivalent: 299 },
  network: { monthly: 899, yearly: 8988, yearlyMonthlyEquivalent: 749 },
};

export function formatPlanPrice(plan: "partner" | "network", interval: BillingInterval): string {
  const pricing = PLAN_PRICING[plan];
  const amount = interval === "monthly" ? pricing.monthly : pricing.yearlyMonthlyEquivalent;
  return `$${amount}`;
}

export function formatPlanBillingNote(plan: "partner" | "network", interval: BillingInterval): string {
  const pricing = PLAN_PRICING[plan];
  if (interval === "monthly") {
    return "Billed monthly — cancel anytime";
  }
  return `Billed annually ($${pricing.yearly.toLocaleString()}/yr)`;
}

export async function activateCommunityPlan() {
  const res = await api.post("/api/billing/activate-community");
  return res.data.data;
}

export async function startCheckout(
  plan: "partner" | "network",
  interval: BillingInterval = "yearly"
) {
  const res = await api.post("/api/billing/checkout", { plan, interval });
  return res.data.data as { url: string };
}

export async function upgradePlan(
  plan: "partner" | "network",
  interval: BillingInterval = "yearly"
) {
  const res = await api.post("/api/billing/upgrade", { plan, interval });
  return res.data.data as { plan?: OrgPlan; upgraded?: boolean; checkoutUrl?: string };
}

export async function cancelSubscription() {
  const res = await api.post("/api/billing/cancel");
  return res.data.data;
}

export async function reactivateSubscription() {
  const res = await api.post("/api/billing/reactivate");
  return res.data.data;
}

export async function getSubscriptionStatus() {
  const res = await api.get("/api/billing/subscription");
  return res.data.data as SubscriptionStatus;
}

export async function openBillingPortal() {
  const res = await api.post("/api/billing/portal");
  return res.data.data as { url: string };
}

function parseBillingInterval(value: string | null | undefined): BillingInterval {
  return value === "monthly" ? "monthly" : "yearly";
}

/** Post-registration or pricing-page plan selection handler */
export async function completePlanSelection(plan: string, intervalInput?: string | null) {
  const interval = parseBillingInterval(intervalInput);

  if (plan === "community" || plan === "free") {
    await activateCommunityPlan();
    return { redirect: "/dashboard/billing/success?plan=community" };
  }
  if (plan === "partner" || plan === "network") {
    const { url } = await startCheckout(plan, interval);
    return { redirect: url };
  }
  return { redirect: "/dashboard" };
}

export const PLAN_LABELS: Record<OrgPlan, string> = {
  community: "Community",
  partner: "Partner Org",
  network: "Network",
};

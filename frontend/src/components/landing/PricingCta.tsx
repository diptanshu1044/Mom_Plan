"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPartnerPortalUrl } from "@/lib/portal-urls";
import type { BillingInterval } from "@/lib/billing";

type PricingCtaProps = {
  planId: "community" | "partner" | "network" | "enterprise";
  label: string;
  href: string;
  interval?: BillingInterval;
  variant?: "outline" | "solid";
  className?: string;
};

const buttonClass = (variant: "outline" | "solid", className?: string) =>
  cn(
    "inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200",
    variant === "solid"
      ? "bg-gradient-primary text-white shadow-primary hover:shadow-primary-lg"
      : "border border-outline-variant bg-white text-on-surface hover:bg-surface-container-low hover:border-primary-200",
    className
  );

function buildPartnerAuthUrl(planId: string, interval: BillingInterval): string {
  const next = `/settings?tab=billing&plan=${planId}&interval=${interval}`;
  const params = new URLSearchParams({ next });
  return getPartnerPortalUrl(`/login?${params.toString()}`);
}

export function PricingCta({
  planId,
  label,
  href,
  interval = "yearly",
  variant = "outline",
  className,
}: PricingCtaProps) {
  if (planId === "enterprise") {
    return (
      <Link href={href} className={buttonClass(variant, className)}>
        {label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    );
  }

  const destination = buildPartnerAuthUrl(planId, interval);

  return (
    <a href={destination} className={buttonClass(variant, className)}>
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </a>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { DashboardMetricsWidget } from "./widgets/DashboardMetricsWidget";
import { CasesChartWidget } from "./widgets/CasesChartWidget";
import { RecentActivityWidget } from "./widgets/RecentActivityWidget";
import { ReferralSummaryWidget } from "./widgets/ReferralSummaryWidget";
import { MetricCardSkeleton } from "@/components/dashboard/MetricCard";
import { CardSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Skeletons for Suspense fallbacks
function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-surface-border shadow-card p-6">
      <div className="w-40 h-5 bg-partner-100 rounded animate-pulse mb-1" />
      <div className="w-56 h-3 bg-partner-50 rounded animate-pulse mb-6" />
      <div className="h-52 bg-partner-50 rounded-xl animate-pulse" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header />

      <div className="flex-1 p-8 space-y-6">
        {/* Metric cards — stream independently */}
        <Suspense fallback={<MetricsSkeleton />}>
          <DashboardMetricsWidget />
        </Suspense>

        {/* Charts + Activity row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Cases trend chart — 2/3 width */}
          <div className="xl:col-span-2">
            <Suspense fallback={<ChartSkeleton />}>
              <CasesChartWidget />
            </Suspense>
          </div>

          {/* Referral summary — 1/3 width */}
          <div>
            <Suspense fallback={<CardSkeleton />}>
              <ReferralSummaryWidget />
            </Suspense>
          </div>
        </div>

        {/* Recent activity */}
        <Suspense fallback={<CardSkeleton />}>
          <RecentActivityWidget />
        </Suspense>
      </div>
    </div>
  );
}

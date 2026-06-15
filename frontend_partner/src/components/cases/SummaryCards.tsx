import { cn, formatNumber } from "@/lib/utils";
import type { DashboardSummary } from "@/types";

interface SummaryCardsProps {
  data: DashboardSummary;
  loading?: boolean;
}

const CARDS = [
  { key: "renewal_due_soon" as const, label: "Renewal Due Soon", sub: "within 14 days", border: "border-l-status-error", color: "text-status-error" },
  { key: "incomplete_docs" as const, label: "Incomplete Docs", sub: "awaiting upload", border: "border-l-status-warning", color: "text-status-warning" },
  { key: "approved_this_quarter" as const, label: "Approved This Quarter", sub: "since quarter start", border: "border-l-status-success", color: "text-status-success" },
  { key: "total_assigned" as const, label: "Total Assigned", sub: "", border: "border-l-partner-600", color: "text-partner-700" },
];

export function SummaryCards({ data, loading }: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-surface-border p-5 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className={cn(
            "bg-white rounded-xl border border-surface-border border-l-4 shadow-card p-5",
            card.border
          )}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-soft mb-1">
            {card.label}
          </div>
          <div className={cn("text-3xl font-extrabold tabular-nums", card.color)}>
            {formatNumber(data[card.key])}
          </div>
          <div className="text-xs text-text-soft mt-0.5">
            {card.key === "total_assigned"
              ? `${data.quarter} ${data.year}`
              : card.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

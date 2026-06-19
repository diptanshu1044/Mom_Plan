"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getCurrentQuarterYear } from "@/lib/utils";
import DeadlinesDashboardTable, { type DashboardResponse } from "./DeadlinesDashboardTable";

export default function ProgramDeadlinesDashboard() {
  const { year: currentYear } = getCurrentQuarterYear();
  const [programType, setProgramType] = useState<"all" | "federal" | "state">("all");
  const [year, setYear] = useState(String(currentYear));
  const [quarter, setQuarter] = useState<"Q1" | "Q2" | "Q3" | "Q4">(
    () => getCurrentQuarterYear().quarter
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["deadlines-dashboard", programType, year, quarter],
    queryFn: () =>
      api
        .get("/api/deadlines/dashboard", {
          params: { type: programType, year, quarter },
        })
        .then((r) => r.data.data as DashboardResponse),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  return (
    <DeadlinesDashboardTable
      items={data?.items ?? []}
      availableYears={data?.availableYears ?? []}
      isLoading={isLoading}
      isFetching={isFetching}
      programType={programType}
      year={year}
      quarter={quarter}
      onProgramTypeChange={setProgramType}
      onYearChange={setYear}
      onQuarterChange={setQuarter}
      emptyTitle="No renewal deadlines found"
      emptyDescription="Complete your eligibility scan to see upcoming program renewal deadlines for your matched benefits."
      emptyDescriptionWithFilters="Try adjusting your filters to see more program renewal dates."
    />
  );
}

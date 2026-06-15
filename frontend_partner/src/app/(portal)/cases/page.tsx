import type { Metadata } from "next";
import { CasesClient } from "./CasesClient";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = { title: "Cases" };

export default function CasesPage() {
  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Cases"
        description="Manage all mother cases assigned to your organization"
      />
      <CasesClient />
    </div>
  );
}

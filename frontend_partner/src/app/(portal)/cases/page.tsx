import type { Metadata } from "next";
import { CaseManagementClient } from "@/components/cases/CaseManagementClient";

export const metadata: Metadata = { title: "Cases" };

export default function CasesPage() {
  return <CaseManagementClient />;
}

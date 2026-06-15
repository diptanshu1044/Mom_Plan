import type { Metadata } from "next";
import { CaseManagementClient } from "@/components/cases/CaseManagementClient";

export const metadata: Metadata = {
  title: "Case Management",
};

export default function DashboardPage() {
  return <CaseManagementClient />;
}

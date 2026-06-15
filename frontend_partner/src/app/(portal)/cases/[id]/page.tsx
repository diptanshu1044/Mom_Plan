import type { Metadata } from "next";
import { CaseShowClient } from "@/components/cases/CaseShowClient";

export const metadata: Metadata = { title: "Case Details" };

export default async function CaseShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CaseShowClient caseId={id} />;
}

import type { Metadata } from "next";
import { AddCaseClient } from "@/components/cases/AddCaseClient";

export const metadata: Metadata = { title: "Add Case" };

export default function AddCasePage() {
  return <AddCaseClient />;
}

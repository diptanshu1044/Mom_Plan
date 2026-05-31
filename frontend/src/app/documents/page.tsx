import { Metadata } from "next";
import RequiredDocumentsPage from "./RequiredDocumentsClient";

export const metadata: Metadata = {
  title: "Required Documents Checklist by Scheme",
  description:
    "Prepare your files before applying. Get a curated checklist of required and optional documents for SNAP, WIC, CCAP, and other major benefit schemes.",
};

export default function DocumentsPage() {
  return <RequiredDocumentsPage />;
}

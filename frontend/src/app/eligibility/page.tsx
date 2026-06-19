import { Suspense } from "react";
import { Metadata } from "next";
import EligibilityPage from "./EligibilityClient";

export const metadata: Metadata = {
  title: "AI-Powered Benefits Eligibility Scan",
  description:
    "Take our 10-minute smart scan to check your family's eligibility for childcare, nutrition, utility, housing, and healthcare subsidies.",
};

export default function EligibilityRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center p-4">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <EligibilityPage />
    </Suspense>
  );
}

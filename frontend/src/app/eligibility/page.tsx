import { Metadata } from "next";
import EligibilityPage from "./EligibilityClient";

export const metadata: Metadata = {
  title: "AI-Powered Benefits Eligibility Scan",
  description:
    "Take our 10-minute smart scan to check your family's eligibility for childcare, nutrition, utility, housing, and healthcare subsidies.",
};

export default function EligibilityRoute() {
  return <EligibilityPage />;
}

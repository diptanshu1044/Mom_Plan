import { Metadata } from "next";
import RegisterPage from "./RegisterClient";

export const metadata: Metadata = {
  title: "Create Your Free Account",
  description:
    "Get started with MomPlan for free. Scan your eligibility for federal and state assistance programs and secure your benefits profile.",
};

export default function RegisterRoute() {
  return <RegisterPage />;
}

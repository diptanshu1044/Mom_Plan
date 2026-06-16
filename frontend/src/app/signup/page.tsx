import { Metadata } from "next";
import SignupSelectorClient from "./SignupSelectorClient";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your MomPlan account as a mother seeking benefits or as an organization supporting families.",
};

export default function SignupPage() {
  return <SignupSelectorClient />;
}

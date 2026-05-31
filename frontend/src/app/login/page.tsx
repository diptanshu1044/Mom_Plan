import { Metadata } from "next";
import LoginPage from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Log in to your secure MomPlan account to track applications, upload documents, and manage your family benefit scans.",
};

export default function LoginRoute() {
  return <LoginPage />;
}

import type { Metadata } from "next";
import { LoginClient } from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign In — MomPlan Partner Portal",
};

export default function LoginPage() {
  return <LoginClient />;
}

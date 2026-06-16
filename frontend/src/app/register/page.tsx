import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Create Your Free Account",
  description:
    "Get started with MomPlan for free. Scan your eligibility for federal and state assistance programs and secure your benefits profile.",
};

type RegisterRouteProps = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function RegisterRoute({ searchParams }: RegisterRouteProps) {
  const params = await searchParams;
  const qs = params.redirect
    ? `?redirect=${encodeURIComponent(params.redirect)}`
    : "";
  redirect(`/signup/mother${qs}`);
}

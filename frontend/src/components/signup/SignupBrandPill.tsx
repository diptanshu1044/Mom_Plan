import Link from "next/link";
import { Heart } from "lucide-react";

export function SignupBrandPill() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 shadow-glass border border-primary-100 hover:opacity-90 transition-opacity"
    >
      <Heart className="w-4 h-4 text-primary-500" fill="currentColor" />
      <span className="text-[11px] font-extrabold text-on-surface-variant tracking-[0.12em] uppercase">
        MomPlan
      </span>
    </Link>
  );
}

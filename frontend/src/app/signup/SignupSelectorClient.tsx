"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { SignupBgPattern } from "@/components/signup/SignupBgPattern";
import { SignupBrandPill } from "@/components/signup/SignupBrandPill";
import { getPartnerPortalUrl } from "@/lib/portal-urls";

const accountTypes = [
  {
    id: "mother",
    emoji: "🤱",
    title: "I'm a Mother",
    description:
      "Discover benefits, track applications, and get support for your family's needs.",
    href: "/signup/mother",
    external: false,
    accentText: "text-primary-600",
    accentBorder: "border-primary-400",
    accentShadow: "shadow-[0_0_0_4px_rgba(77,65,223,0.13),0_8px_28px_rgba(77,65,223,0.16)]",
    hoverBorder: "hover:border-primary-400",
    hoverBg: "hover:bg-gradient-to-br hover:from-primary-50 hover:to-secondary-50/60",
    iconBg: "bg-primary-50 group-hover:bg-gradient-to-br group-hover:from-primary-100 group-hover:to-primary-200/70",
  },
  {
    id: "organization",
    emoji: "🏢",
    title: "I'm an Organization",
    description:
      "Register your organization to manage cases, referrals, and community impact.",
    href: getPartnerPortalUrl("/signup"),
    external: true,
    accentText: "text-secondary-600",
    accentBorder: "border-secondary-400",
    accentShadow: "shadow-[0_0_0_4px_rgba(103,75,181,0.13),0_8px_28px_rgba(103,75,181,0.16)]",
    hoverBorder: "hover:border-secondary-400",
    hoverBg: "hover:bg-gradient-to-br hover:from-secondary-50 hover:to-primary-50/40",
    iconBg: "bg-secondary-50 group-hover:bg-gradient-to-br group-hover:from-secondary-100 group-hover:to-secondary-200/70",
  },
] as const;

function AccountTypeCard({
  type,
  hovered,
  onHover,
}: {
  type: (typeof accountTypes)[number];
  hovered: boolean;
  onHover: (id: string | null) => void;
}) {
  const cardClassName = [
    "group block w-full text-left p-5 rounded-[18px] cursor-pointer border-2 transition-all duration-200 outline-none font-sans",
    "bg-white shadow-[0_2px_10px_rgba(77,65,223,0.06)]",
    hovered ? type.accentBorder : "border-primary-100",
    hovered ? type.accentShadow : "",
    hovered ? `bg-gradient-to-br ${type.id === "mother" ? "from-primary-50 to-secondary-50/60" : "from-secondary-50 to-primary-50/40"}` : "",
    !hovered ? type.hoverBorder : "",
    !hovered ? type.hoverBg : "",
  ].join(" ");

  const content = (
    <>
      <div className="flex items-start justify-between mb-2.5">
        <div
          className={`w-[46px] h-[46px] rounded-xl flex items-center justify-center text-2xl transition-all duration-200 ${type.iconBg} ${hovered ? "shadow-primary" : ""}`}
        >
          {type.emoji}
        </div>
        {hovered && (
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white font-black ${type.id === "mother" ? "bg-primary-500" : "bg-secondary-500"}`}
          >
            ✓
          </div>
        )}
      </div>
      <div
        className={`text-[15px] font-extrabold mb-1.5 transition-colors ${hovered ? type.accentText : "text-on-surface"}`}
      >
        {type.title}
      </div>
      <div className="text-xs text-on-surface-variant leading-relaxed">
        {type.description}
      </div>
    </>
  );

  if (type.external) {
    return (
      <a
        href={type.href}
        className={cardClassName}
        onMouseEnter={() => onHover(type.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(type.id)}
        onBlur={() => onHover(null)}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={type.href}
      className={cardClassName}
      onMouseEnter={() => onHover(type.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(type.id)}
      onBlur={() => onHover(null)}
    >
      {content}
    </Link>
  );
}

export default function SignupSelectorClient() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-gradient-hero"
      suppressHydrationWarning
    >
      <SignupBgPattern />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-start px-6 pt-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-7"
        >
          <div className="mb-3.5">
            <SignupBrandPill />
          </div>
          <h1 className="font-display font-semibold text-[clamp(26px,4vw,38px)] text-on-surface mb-1.5 leading-tight">
            Who are you signing up as?
          </h1>
          <p className="text-sm text-on-surface-variant">
            Choose the option that best describes you to get started.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-[680px] mb-6"
        >
          {accountTypes.map((type) => (
            <AccountTypeCard
              key={type.id}
              type={type}
              hovered={hovered === type.id}
              onHover={setHovered}
            />
          ))}
        </motion.div>

        <p className="text-[13px] text-on-surface-variant/70 mb-8">
          Select a card above to begin ↑
        </p>

        <p className="text-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary-500 hover:text-primary-600 font-semibold"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

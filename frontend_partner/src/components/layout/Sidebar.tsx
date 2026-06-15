"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FolderOpen,
  ArrowLeftRight,
  FileText,
  BarChart3,
  Settings,
  Heart,
  LogOut,
  Building2,
  Users,
  Bell,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePartnerAuthStore } from "@/store/auth.store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

const NAV = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Cases", href: "/cases", icon: FolderOpen },
      { label: "Referrals", href: "/referrals", icon: ArrowLeftRight },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    section: "Insights",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    section: "Management",
    items: [
      { label: "Organization", href: "/organization", icon: Building2 },
      { label: "Team", href: "/team", icon: Users },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, organization, logout } = usePartnerAuthStore();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-[288px] min-w-[288px] h-screen flex flex-col bg-gradient-to-b from-[#1e0a3c] via-[#2d1260] to-[#1a0a30] border-r border-white/10 overflow-hidden">
      {/* Brand */}
      <div className="px-6 pt-7 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-partner rounded-xl flex items-center justify-center shadow-partner">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <div className="text-white font-extrabold text-base leading-none">MomPlan</div>
            <div className="text-white/45 text-[10px] font-semibold tracking-widest uppercase mt-0.5">
              Partner Portal
            </div>
          </div>
        </div>

        {/* Organization badge */}
        {organization && (
          <div className="mt-4 px-3 py-2.5 rounded-xl bg-white/10 border border-white/15">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-partner flex items-center justify-center text-xs font-bold text-white shrink-0">
                {initials(organization.name)}
              </div>
              <div className="min-w-0">
                <div className="text-white/90 text-xs font-semibold truncate">{organization.name}</div>
                <div className="text-white/40 text-[10px] truncate">{organization.type}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="px-3 mb-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
              {group.section}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative",
                        active
                          ? "bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                          : "text-white/55 hover:text-white hover:bg-white/8"
                      )}
                    >
                      {active && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute inset-0 bg-white/12 rounded-xl"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        />
                      )}
                      <item.icon
                        className={cn(
                          "w-[18px] h-[18px] shrink-0 relative z-10 transition-colors",
                          active ? "text-partner-300" : "text-white/40 group-hover:text-white/70"
                        )}
                      />
                      <span className="relative z-10 flex-1">{item.label}</span>
                      {active && (
                        <ChevronRight className="w-3.5 h-3.5 text-white/40 relative z-10" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/8 transition-colors group">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={user?.avatar_url ?? ""} alt={user?.full_name} />
            <AvatarFallback className="text-xs">{initials(user?.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-white/90 text-xs font-semibold truncate">{user?.full_name}</div>
            <div className="text-white/40 text-[10px] truncate">{user?.email}</div>
          </div>
          <button
            onClick={() => logout()}
            className="text-white/30 hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/10"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

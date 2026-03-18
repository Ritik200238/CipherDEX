"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Gavel,
  ShieldCheck,
  Target,
  Layers,
  PieChart,
  Users,
  Star,
  Shield,
  ChevronRight,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard, ArrowLeftRight, Gavel, ShieldCheck,
  Target, Layers, PieChart, Users, Star,
};

const SECTION_MAP: Record<string, string> = {
  "/": "Overview",
  "/trade": "Trading",
  "/auctions": "Trading",
  "/escrow": "Trading",
  "/limits": "Trading",
  "/batch": "Trading",
  "/portfolio": "Portfolio",
  "/otc": "Trading",
  "/reputation": "Portfolio",
};

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  // Group nav items by section
  const sections: { label: string; items: typeof NAV_ITEMS[number][] }[] = [
    {
      label: "Overview",
      items: NAV_ITEMS.filter((i) => i.href === "/"),
    },
    {
      label: "Trading",
      items: NAV_ITEMS.filter((i) =>
        ["/trade", "/auctions", "/escrow", "/limits", "/batch", "/otc"].includes(i.href)
      ),
    },
    {
      label: "Portfolio",
      items: NAV_ITEMS.filter((i) => ["/portfolio", "/reputation"].includes(i.href)),
    },
  ];

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`
        fixed left-0 top-0 bottom-0 flex flex-col z-50
        bg-[var(--void-1)]/95 backdrop-blur-xl
        border-r border-[var(--border-subtle)]
        transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${expanded ? "w-56" : "w-[68px]"}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 border-b border-[var(--border-subtle)] ${expanded ? "px-5" : "px-0 justify-center"}`}>
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--cipher-violet)] to-[var(--cipher-cyan)] opacity-90" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield size={16} className="text-white drop-shadow-lg" />
            </div>
          </div>
          {expanded && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-[var(--text-primary)] tracking-tight leading-none">
                CipherDEX
              </h1>
              <p className="text-[9px] text-[var(--text-muted)] tracking-[0.15em] uppercase mt-0.5">
                Encrypted Trading
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {sections.map((section) => (
          <div key={section.label} className="mb-2">
            {expanded && (
              <p className="px-5 py-1.5 text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.2em]">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
              const Icon = ICON_MAP[item.icon];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!expanded ? item.label : undefined}
                  className={`
                    flex items-center gap-3 mx-2 rounded-lg transition-all duration-200 group relative
                    ${expanded ? "px-3 py-2" : "px-0 py-2 justify-center"}
                    ${isActive
                      ? "bg-[var(--cipher-violet)]/10 text-[var(--cipher-violet)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.02]"
                    }
                  `}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--cipher-violet)]" />
                  )}

                  {Icon && (
                    <Icon
                      size={18}
                      className={`shrink-0 transition-colors ${
                        isActive ? "text-[var(--cipher-violet)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                      }`}
                    />
                  )}
                  {expanded && (
                    <span className={`text-[13px] font-medium truncate ${isActive ? "text-[var(--text-primary)]" : ""}`}>
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Expand indicator */}
      <div className={`px-3 py-3 border-t border-[var(--border-subtle)] flex items-center ${expanded ? "justify-between" : "justify-center"}`}>
        {expanded ? (
          <>
            <span className="text-[9px] text-[var(--text-muted)] tracking-wider uppercase">
              Powered by Fhenix FHE
            </span>
            <ChevronRight size={12} className="text-[var(--text-muted)] rotate-180" />
          </>
        ) : (
          <ChevronRight size={12} className="text-[var(--text-muted)]" />
        )}
      </div>
    </aside>
  );
}

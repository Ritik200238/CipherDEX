"use client";

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
  Lock,
} from "lucide-react";

/** Map icon names from constants to Lucide components */
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  ArrowLeftRight,
  Gavel,
  ShieldCheck,
  Target,
  Layers,
  PieChart,
  Users,
  Star,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-64 flex flex-col
                 bg-[#0d0e1a]/90 backdrop-blur-md border-r border-purple-500/10
                 z-40"
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-purple-500/10">
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500
                        flex items-center justify-center
                        group-hover:shadow-[0_0_16px_rgba(139,92,246,0.4)] transition-shadow duration-300"
          >
            <Lock size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text leading-tight">CipherDEX</h1>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase">
              Confidential Trading
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = ICON_MAP[item.icon];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? "bg-purple-600/15 text-purple-300 border border-purple-500/20"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] border border-transparent"
                }
              `}
            >
              {Icon && (
                <Icon
                  size={18}
                  className={isActive ? "text-purple-400" : "text-gray-500"}
                />
              )}
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-purple-500/10">
        <div className="flex items-center gap-2 text-[10px] text-gray-600">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
          Powered by Fhenix FHE
        </div>
      </div>
    </aside>
  );
}

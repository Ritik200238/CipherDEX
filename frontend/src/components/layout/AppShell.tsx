"use client";

import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain">
      {/* Ambient background glows */}
      <div className="ambient-glow w-[600px] h-[600px] bg-[var(--cipher-violet)] opacity-[0.03] -top-40 -left-40" />
      <div className="ambient-glow w-[500px] h-[500px] bg-[var(--cipher-cyan)] opacity-[0.02] top-1/2 -right-60" style={{ animationDelay: "4s" }} />
      <div className="ambient-glow w-[400px] h-[400px] bg-[var(--cipher-blue)] opacity-[0.02] -bottom-20 left-1/3" style={{ animationDelay: "2s" }} />

      <Sidebar />
      <Navbar />
      <main className="ml-[68px] mt-14 min-h-[calc(100vh-3.5rem)] relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

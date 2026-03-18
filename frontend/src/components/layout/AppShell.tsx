"use client";

import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

/**
 * App shell that renders the sidebar + navbar chrome around page content.
 * This is a client component because it uses hooks from the providers.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <Navbar />
      <main className="ml-64 mt-16 min-h-[calc(100vh-4rem)] p-6">{children}</main>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  Map,
  Wrench,
  NotebookPen,
  GitMerge,
  History,
  Menu,
  X,
  SunMedium,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIkigai } from "@/components/providers/ikigai-provider";

const NAV = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/daily", label: "Daily", icon: SunMedium },
  { href: "/map", label: "Map", icon: Map },
  { href: "/skills", label: "Skills", icon: Wrench },
  { href: "/insights", label: "Insights", icon: GitMerge },
  { href: "/reflect", label: "Reflect", icon: Sparkles },
  { href: "/timeline", label: "Timeline", icon: History },
  { href: "/notes", label: "Notes", icon: NotebookPen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { diskPath, ready } = useIkigai();

  return (
    <div className="relative min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[var(--background)]" />
        <div className="absolute -left-1/4 top-0 h-[55vh] w-[65vw] rounded-full bg-[var(--accent)]/[0.06] blur-3xl" />
        <div className="absolute -right-1/5 bottom-0 h-[45vh] w-[55vw] rounded-full bg-slate-400/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-[var(--border)]/80 bg-[var(--background)]/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="group">
            <span className="font-display text-xl font-bold tracking-tight text-[var(--foreground)] transition group-hover:text-[var(--accent)]">
              Ikigai
            </span>
            <span className="ml-1.5 text-xs font-medium text-[var(--muted)]">
              2.0
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-md bg-[var(--surface)] shadow-sm ring-1 ring-[var(--border)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>

        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-[var(--border)] px-4 py-3 sm:hidden"
          >
            <ul className="flex flex-col gap-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm",
                        active
                          ? "bg-[var(--surface)] text-[var(--foreground)]"
                          : "text-[var(--muted)]"
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.nav>
        )}
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>

      <footer className="mx-auto max-w-4xl border-t border-[var(--border)] px-4 py-8 text-center text-xs text-[var(--muted)] sm:px-6 print:hidden">
        {ready ? (
          <>
            Saved on this computer
            {diskPath ? (
              <>
                {" "}
                · <span className="break-all font-mono text-[10px]">{diskPath}</span>
              </>
            ) : (
              " · data/ikigai-store.json"
            )}
          </>
        ) : (
          "Loading saved data…"
        )}
      </footer>
    </div>
  );
}

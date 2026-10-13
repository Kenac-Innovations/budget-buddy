"use client";

import { FileSpreadsheet, Menu, Moon, Sun, Wallet, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Humaflow shell: 236px sidebar, 68px topbar, screen capped at 1240px. Below 900px the sidebar is a drawer.

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only things waiting on the viewer. */
  count?: number;
}

// Only screens that exist are listed; the rest of the spec's IA is added as each screen ships.
const NAV: NavItem[] = [{ href: "/", label: "Budget", icon: FileSpreadsheet }];

export function AppShell({ topbar, children, nav = NAV }: { topbar: ReactNode; children: ReactNode; nav?: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh bg-bg">
      {open && <div className="fixed inset-0 z-[110] bg-[var(--scrim)] nav:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[120] flex w-[var(--sb-w)] flex-col border-r border-line-2 bg-surface transition-transform duration-200 nav:sticky nav:top-0 nav:z-30 nav:h-dvh nav:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex min-h-20 items-center gap-2.5 px-5">
          <span className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-nav-primary text-nav-primary-fg">
            <Wallet className="size-4" strokeWidth={1.7} />
          </span>
          <div>
            <p className="text-wordmark text-brand">Budget Buddy</p>
            <p className="text-[11px] font-semibold text-ink-3">by Kenac Computer Systems</p>
          </div>
          <button className="ml-auto rounded-md p-1.5 text-ink-2 hover:bg-surface-2 nav:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="size-[18px]" />
          </button>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1 px-3 py-2">
          {nav.map(({ href, label, icon: Icon, count }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-[46px] items-center gap-3 rounded-lg px-3.5 py-[11px] text-sm font-medium transition-colors duration-[130ms]",
                  active ? "bg-nav-primary font-semibold text-nav-primary-fg shadow-sm" : "text-nav-muted hover:bg-nav-accent",
                )}
              >
                <Icon className="size-[19px]" strokeWidth={1.7} />
                <span className="flex-1">{label}</span>
                {count ? (
                  <span
                    className={cn(
                      "grid h-[23px] min-w-[23px] place-items-center rounded-full px-1.5 text-xs font-bold",
                      active ? "bg-nav-primary-fg text-nav-primary" : "bg-nav-primary text-nav-primary-fg",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[68px] items-center gap-3 border-b border-line-2 bg-surface px-4 nav:px-[34px]">
          <button className="rounded-md p-2 text-ink-2 hover:bg-surface-2 nav:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-3">{topbar}</div>
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-16 nav:pt-[30px] nav:pr-[70px] nav:pl-[34px]">{children}</main>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const toggle = () => {
    const dark = document.documentElement.classList.toggle("hf-theme-dark");
    try {
      localStorage.setItem("bb-theme", dark ? "dark" : "light");
    } catch {}
  };
  return (
    <button onClick={toggle} className="rounded-md p-2 text-ink-2 hover:bg-surface-2" aria-label="Switch light or dark theme">
      <Moon className="size-[18px] dark:hidden" strokeWidth={1.7} />
      <Sun className="hidden size-[18px] dark:block" strokeWidth={1.7} />
    </button>
  );
}

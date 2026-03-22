import type { ReactNode } from "react";
import Link from "next/link";
import {
  AppSidebarPostButton,
  MobileProfileLink,
  SidebarProfileLink,
} from "@/components/shell/AppSidebarProfileNav";
import { AppSidebarSpacesList } from "@/components/shell/AppSidebarSpacesList";
import { AppSidebarWebsitesButton } from "@/components/shell/AppSidebarWebsitesButton";
import { shellRailOnLaunchClass, shellRailTileClass } from "@/lib/ui/appShellClasses";

export type AppNavActive = "feeds" | "search" | "profile";

function RailDivider() {
  return <div className="h-0.5 w-10 shrink-0 rounded-full bg-white/10" aria-hidden />;
}

function SquareLink({
  href,
  active,
  label,
  className,
  children,
  badge,
}: {
  href: string;
  active?: boolean;
  label: string;
  className: string;
  children: ReactNode;
  badge?: string | number;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={label}
      title={label}
      className={`relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-3xl transition ${className} ${
        active ? "ring-2 ring-white/25 ring-offset-[3px] ring-offset-[#080c14]" : ""
      }`}
    >
      {children}
      {badge != null && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-[#080c14] bg-rose-500 px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function AppSidebar({ active }: { active: AppNavActive }) {
  return (
    <aside className="relative z-20 hidden w-[100px] shrink-0 flex-col border-r border-white/5 bg-[#080c14] px-2 md:sticky md:top-0 md:flex md:min-h-dvh md:min-h-[100svh] md:self-stretch">
      <nav className="scrollbar-hide flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto py-4">
        <SquareLink
          href="/feeds"
          active={active === "feeds"}
          label="Feeds"
          className={`${shellRailTileClass} text-lg font-bold ${shellRailOnLaunchClass}`}
        >
          J
        </SquareLink>

        <SquareLink
          href="/search"
          active={active === "search"}
          label="Search"
          className={shellRailTileClass}
        >
          <svg className={`h-7 w-7 ${shellRailOnLaunchClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </SquareLink>

        <SidebarProfileLink active={active === "profile"} />

        <AppSidebarPostButton />

        <Link
          href="/settings"
          prefetch={false}
          aria-label="Settings"
          title="Settings"
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl ${shellRailTileClass}`}
        >
          <svg className={`h-7 w-7 ${shellRailOnLaunchClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>

        <AppSidebarWebsitesButton />

        <RailDivider />

        <AppSidebarSpacesList />

      </nav>
    </aside>
  );
}

export function AppBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 opacity-40"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(236,72,153,0.12), transparent), radial-gradient(ellipse 50% 30% at 0% 80%, rgba(56,189,248,0.1), transparent)",
      }}
    />
  );
}

export function AppMobileNav({ active }: { active: AppNavActive }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/5 bg-[#0a0e1a]/95 px-6 pt-3 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0a0e1a]/88 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-[420px] items-center justify-between gap-1">
        <Link
          href="/feeds"
          className={`flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-2xl px-2 transition active:scale-[0.98] ${active === "feeds" ? "bg-white/10 ring-1 ring-white/10" : "text-slate-500"}`}
          aria-current={active === "feeds" ? "page" : undefined}
        >
          <span className="text-sm font-bold text-white">J</span>
        </Link>
        <Link
          href="/search"
          className={`flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-2xl transition active:scale-[0.98] ${active === "search" ? "bg-white/10 text-white ring-1 ring-white/10" : "text-slate-500"}`}
          aria-current={active === "search" ? "page" : undefined}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </Link>
        <MobileProfileLink active={active === "profile"} />
      </div>
    </nav>
  );
}

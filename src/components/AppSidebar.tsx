import type { ReactNode } from "react";
import Link from "next/link";
import { AppSidebarPostButton } from "@/components/AppSidebarPostButton";

export type AppNavActive = "feeds" | "search" | "messages" | "profile";

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
      aria-label={label}
      title={label}
      className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl transition ${className} ${
        active ? "ring-2 ring-white/25 ring-offset-[3px] ring-offset-[#080c14]" : "hover:opacity-95"
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

export function AppSidebar({
  active,
  postSlot: _postSlot,
}: {
  active: AppNavActive;
  postSlot?: ReactNode;
}) {
  return (
    <aside className="relative z-20 hidden w-[100px] shrink-0 flex-col border-r border-white/5 bg-[#080c14] px-2 lg:sticky lg:top-0 lg:flex lg:h-screen">
      <nav className="scrollbar-hide flex flex-1 flex-col items-center gap-3 overflow-y-auto py-4">
        <SquareLink
          href="/feeds"
          active={active === "feeds"}
          label="Feeds"
          className="bg-gradient-to-br from-emerald-400 to-sky-500 text-lg font-bold text-slate-950 shadow-lg shadow-emerald-500/10 ring-1 ring-white/10"
        >
          J
        </SquareLink>

        <SquareLink
          href="/search"
          active={active === "search"}
          label="Search"
          className="bg-gradient-to-br from-emerald-500 to-sky-500 shadow-lg ring-1 ring-white/10"
        >
          <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </SquareLink>

        <SquareLink
          href="/profile"
          active={active === "profile"}
          label="Profile"
          badge={2}
          className="bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg ring-1 ring-white/10"
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </SquareLink>

        <AppSidebarPostButton />

        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-b from-slate-900 via-emerald-950 to-teal-900 text-emerald-400 shadow-md ring-1 ring-emerald-500/30 transition hover:opacity-95 hover:ring-emerald-400/40"
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>

        <RailDivider />

        <SquareLink
          href="/messages"
          active={active === "messages"}
          label="Messages"
          className="bg-gradient-to-br from-teal-500 to-emerald-500 text-2xl text-white shadow-md ring-1 ring-white/10"
        >
          <span className="select-none drop-shadow-sm">✦</span>
        </SquareLink>

        <SquareLink
          href="/messages"
          label="Ship room"
          badge={1}
          className="bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md ring-1 ring-white/10"
        >
          <span className="select-none text-xl">⬡</span>
        </SquareLink>

        <SquareLink
          href="/feeds"
          label="Clients"
          className="bg-[#1a1d24] text-white ring-1 ring-white/10"
        >
          <span className="select-none text-xl text-white/95">◎</span>
        </SquareLink>

        <SquareLink
          href="/search"
          label="Browse"
          className="bg-gradient-to-br from-sky-600 to-indigo-700 text-white shadow-md ring-1 ring-white/10"
        >
          <span className="select-none text-xl">◎</span>
        </SquareLink>

        <SquareLink
          href="/feeds"
          label="Brand"
          className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white shadow-md ring-1 ring-emerald-900/50"
        >
          <span className="select-none text-xl">◇</span>
        </SquareLink>

        <RailDivider />

        <SquareLink
          href="/search"
          label="Discover"
          className="bg-gradient-to-br from-slate-800 to-slate-900 text-sky-400 ring-1 ring-sky-500/20"
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
          </svg>
        </SquareLink>
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
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/5 bg-[#0a0e1a]/90 px-6 py-3 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-[420px] items-center justify-between">
        <Link
          href="/feeds"
          className={`flex h-12 w-14 items-center justify-center rounded-2xl ${active === "feeds" ? "bg-white/10 ring-1 ring-white/10" : "text-slate-500"}`}
          aria-current={active === "feeds" ? "page" : undefined}
        >
          <span className="text-sm font-bold text-white">J</span>
        </Link>
        <Link
          href="/search"
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active === "search" ? "bg-white/10 text-white ring-1 ring-white/10" : "text-slate-500"}`}
          aria-current={active === "search" ? "page" : undefined}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </Link>
        <Link
          href="/messages"
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active === "messages" ? "bg-white/10 text-white ring-1 ring-white/10" : "text-slate-500"}`}
          aria-current={active === "messages" ? "page" : undefined}
        >
          <span className="text-lg text-white">✦</span>
        </Link>
        <Link
          href="/profile"
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active === "profile" ? "bg-white/10 text-white ring-1 ring-white/10" : "text-slate-500"}`}
          aria-label="Profile"
          aria-current={active === "profile" ? "page" : undefined}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}

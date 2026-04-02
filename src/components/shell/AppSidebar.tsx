import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppSidebarPostButton,
  SidebarProfileLink,
} from "@/components/shell/AppSidebarProfileNav";
import { AppSidebarSpacesList } from "@/components/shell/AppSidebarSpacesList";
import { AppSidebarWebsitesButton } from "@/components/shell/AppSidebarWebsitesButton";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
import { sidebarProfilePath } from "@/lib/profilePath";
import { shellRailOnLaunchClass, shellRailTileClass } from "@/lib/ui/appShellClasses";

export type AppNavActive = "feeds" | "search" | "profile" | "settings";

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
  const pathname = usePathname();
  const isFeedsRoute = pathname === "/feeds" || pathname.startsWith("/feeds/");
  const isSearchRoute = pathname === "/search" || pathname.startsWith("/search/");
  const isSettingsRoute = pathname === "/settings" || pathname.startsWith("/settings/");
  const isProfileRoute = pathname.startsWith("/u/");

  // Only show the "active" ring when we're on that section's route.
  // This avoids double-highlighting (e.g. in a Space route `/<code>`).
  const feedsActive = active === "feeds" && isFeedsRoute;
  const searchActive = active === "search" && isSearchRoute;
  const settingsActive = active === "settings" && isSettingsRoute;
  const profileActive = active === "profile" && isProfileRoute;

  return (
    <aside className="relative z-20 hidden w-[100px] shrink-0 flex-col border-r border-white/5 bg-[#080c14] px-2 md:fixed md:inset-y-0 md:left-0 md:flex md:min-h-dvh md:min-h-[100svh] md:self-stretch">
      <nav className="scrollbar-hide flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto py-4">
        <SquareLink
          href="/feeds"
          active={feedsActive}
          label="Feeds"
          className={`${shellRailTileClass} text-lg font-bold ${shellRailOnLaunchClass}`}
        >
          J
        </SquareLink>

        <SquareLink
          href="/search"
          active={searchActive}
          label="Search"
          className={shellRailTileClass}
        >
          <svg className={`h-7 w-7 ${shellRailOnLaunchClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </SquareLink>

        <SidebarProfileLink active={profileActive} />

        <AppSidebarPostButton />

        <SquareLink
          href="/settings"
          active={settingsActive}
          label="Settings"
          className={shellRailTileClass}
        >
          <svg className={`h-7 w-7 ${shellRailOnLaunchClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </SquareLink>

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
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56,189,248,0.22), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(16,185,129,0.1), transparent), radial-gradient(ellipse 50% 30% at 0% 80%, rgba(99,102,241,0.1), transparent)",
      }}
    />
  );
}

export function AppMobileDrawer({
  active,
  open,
  translateX,
  onClose,
}: {
  active: AppNavActive;
  open: boolean;
  translateX: number;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const isFeedsRoute = pathname === "/feeds" || pathname.startsWith("/feeds/");
  const isSearchRoute = pathname === "/search" || pathname.startsWith("/search/");
  const isSettingsRoute = pathname === "/settings" || pathname.startsWith("/settings/");
  const isProfileRoute = pathname.startsWith("/u/");
  const feedsActive = active === "feeds" && isFeedsRoute;
  const searchActive = active === "search" && isSearchRoute;
  const settingsActive = active === "settings" && isSettingsRoute;
  const profileActive = active === "profile" && isProfileRoute;

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/45 transition-opacity duration-300 md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[100px] border-r border-white/5 bg-[#080c14] px-2 transition-transform duration-300 ease-out md:hidden`}
        style={{ transform: `translate3d(${translateX}px, 0, 0)`, willChange: "transform" }}
        aria-hidden={!open}
      >
        <nav className="scrollbar-hide flex min-h-0 h-full flex-1 flex-col items-center gap-3 overflow-y-auto py-4">
          <SquareLink
            href="/feeds"
            active={feedsActive}
            label="Feeds"
            className={`${shellRailTileClass} text-lg font-bold ${shellRailOnLaunchClass}`}
          >
            J
          </SquareLink>

          <SquareLink
            href="/search"
            active={searchActive}
            label="Search"
            className={shellRailTileClass}
          >
            <svg className={`h-7 w-7 ${shellRailOnLaunchClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </SquareLink>

          <SidebarProfileLink active={profileActive} />

          <AppSidebarPostButton />

          <SquareLink
            href="/settings"
            active={settingsActive}
            label="Settings"
            className={shellRailTileClass}
          >
            <svg className={`h-7 w-7 ${shellRailOnLaunchClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </SquareLink>

          <AppSidebarWebsitesButton />

          <RailDivider />

          <AppSidebarSpacesList />
        </nav>
      </aside>
    </>
  );
}

export function AppMobileNav({ active }: { active: AppNavActive }) {
  const pathname = usePathname();
  const router = useRouter();
  const { tag, ready } = useAuthSnapshot();
  const profileHref = sidebarProfilePath(tag, ready);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [dragDx, setDragDx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const isFeedsRoute = pathname === "/feeds" || pathname.startsWith("/feeds/");
  const isSearchRoute = pathname === "/search" || pathname.startsWith("/search/");
  const isSettingsRoute = pathname === "/settings" || pathname.startsWith("/settings/");
  const isProfileRoute = pathname.startsWith("/u/");

  const navItems = useMemo(
    () => [
      {
        id: "feeds",
        label: "Feeds",
        href: "/feeds",
        active: active === "feeds" && isFeedsRoute,
        icon: <span className="text-sm font-bold leading-none">J</span>,
      },
      {
        id: "search",
        label: "Search",
        href: "/search",
        active: active === "search" && isSearchRoute,
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        ),
      },
      {
        id: "profile",
        label: "Profile",
        href: profileHref,
        active: active === "profile" && isProfileRoute,
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
        ),
      },
      {
        id: "settings",
        label: "Settings",
        href: "/settings",
        active: active === "settings" && isSettingsRoute,
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
    [active, isFeedsRoute, isProfileRoute, isSearchRoute, isSettingsRoute, profileHref]
  );

  const activeIndex = Math.max(0, navItems.findIndex((item) => item.active));
  const indicatorTranslate = `calc(${activeIndex * 100}% + ${isDragging ? `${dragDx}px` : "0px"})`;

  const onTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setDragDx(0);
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (!touchStart) return;
    const touch = e.touches[0];
    if (!touch) return;
    setDragDx(touch.clientX - touchStart.x);
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (!touchStart) return;
    const touch = e.changedTouches[0];
    if (!touch) {
      setTouchStart(null);
      setDragDx(0);
      setIsDragging(false);
      return;
    }
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    const horizontalSwipe = Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy);
    if (horizontalSwipe) {
      const nextIndex = dx > 0 ? activeIndex - 1 : activeIndex + 1;
      const clampedIndex = Math.max(0, Math.min(navItems.length - 1, nextIndex));
      if (clampedIndex !== activeIndex) {
        router.push(navItems[clampedIndex].href);
      }
    }
    setTouchStart(null);
    setDragDx(0);
    setIsDragging(false);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/5 bg-[#0a0e1a]/95 px-4 pt-3 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0a0e1a]/88 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:hidden"
      aria-label="Primary"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="mx-auto max-w-[460px]">
        <div className="relative grid grid-cols-4 rounded-2xl bg-white/[0.04] p-1.5 ring-1 ring-white/10">
          <div
            className={`pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 w-[calc(25%-0.375rem)] rounded-xl border border-white/15 bg-white/10 shadow-[0_10px_26px_rgba(0,0,0,0.32)] ${isDragging ? "" : "transition-transform duration-300 ease-out"}`}
            style={{ transform: `translateX(${indicatorTranslate})` }}
            aria-hidden
          />
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              prefetch={false}
              className={`relative z-[1] flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition active:scale-[0.98] ${
                item.active ? "text-white" : "text-slate-400"
              }`}
              aria-label={item.label}
              aria-current={item.active ? "page" : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

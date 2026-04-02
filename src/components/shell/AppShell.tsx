 "use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AppBackground,
  AppMobileDrawer,
  AppMobileNav,
  AppSidebar,
  type AppNavActive,
} from "@/components/shell/AppSidebar";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";

/** `md:flex-row` is required — without it, sidebar stacks above content and wastes the whole top band. */
const defaultMainClass =
  "flex min-h-dvh min-h-[100svh] w-full max-w-[100vw] flex-col overflow-x-hidden bg-[var(--bg-app)] text-white antialiased md:min-h-screen md:flex-row";

type AppShellProps = {
  active: AppNavActive;
  children: ReactNode;
  /** Override when a page needs a different root (e.g. Settings `h-dvh`). */
  mainClassName?: string;
  /** Hide the desktop left rail (e.g. `/invite/...` landing). */
  hideSidebar?: boolean;
};

/** Shared app chrome: background, sidebar, mobile nav, and one main content column as `children`. */
export function AppShell({ active, children, mainClassName, hideSidebar }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, user } = useAuthSnapshot();
  const isPublicRoute = pathname === "/" || pathname === "/login";
  const drawerWidth = 100;
  const iosBackSwipeSafeZone = 28;
  const drawerOpenStartMaxX = 96;
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileDrawerX, setMobileDrawerX] = useState(-drawerWidth);
  const [mobileDragging, setMobileDragging] = useState(false);
  const gestureRef = useRef<{
    mode: "open" | "close" | null;
    startX: number;
    startY: number;
    startTranslate: number;
  }>({
    mode: null,
    startX: 0,
    startY: 0,
    startTranslate: -drawerWidth,
  });

  useEffect(() => {
    if (!ready || user || isPublicRoute) return;
    router.replace("/");
  }, [ready, user, isPublicRoute, router]);

  useEffect(() => {
    setMobileDrawerOpen(false);
    setMobileDrawerX(-drawerWidth);
    setMobileDragging(false);
    gestureRef.current.mode = null;
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileDrawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileDrawerOpen]);

  const closeDrawer = () => {
    setMobileDragging(false);
    setMobileDrawerOpen(false);
    setMobileDrawerX(-drawerWidth);
    gestureRef.current.mode = null;
  };

  const onTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (hideSidebar) return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    const touch = event.touches[0];
    if (!touch) return;
    const canOpen =
      !mobileDrawerOpen &&
      touch.clientX >= iosBackSwipeSafeZone &&
      touch.clientX <= drawerOpenStartMaxX;
    const canClose = mobileDrawerOpen && touch.clientX <= drawerWidth + 24;
    if (!canOpen && !canClose) return;
    setMobileDragging(true);
    setMobileDrawerOpen(true);
    gestureRef.current = {
      mode: canOpen ? "open" : "close",
      startX: touch.clientX,
      startY: touch.clientY,
      startTranslate: canOpen ? -drawerWidth : 0,
    };
    setMobileDrawerX(canOpen ? -drawerWidth : 0);
  };

  const onTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    const g = gestureRef.current;
    if (!touch || !g.mode) return;
    const dx = touch.clientX - g.startX;
    const dy = touch.clientY - g.startY;
    if (Math.abs(dy) > Math.abs(dx) + 8) return;
    const next = Math.max(-drawerWidth, Math.min(0, g.startTranslate + dx));
    setMobileDrawerX(next);
  };

  const onTouchEnd = () => {
    const g = gestureRef.current;
    if (!g.mode) return;
    const shouldOpen = mobileDrawerX > -drawerWidth * 0.45;
    setMobileDragging(false);
    setMobileDrawerOpen(shouldOpen);
    setMobileDrawerX(shouldOpen ? 0 : -drawerWidth);
    gestureRef.current.mode = null;
  };

  if (!ready || (!user && !isPublicRoute)) {
    return (
      <main className={mainClassName ?? defaultMainClass}>
        <AppBackground />
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <p className="text-sm text-slate-500">Redirecting to home…</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className={mainClassName ?? defaultMainClass}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <AppBackground />
      {!hideSidebar && <AppSidebar active={active} />}
      {!hideSidebar && (
        <AppMobileDrawer
          active={active}
          open={mobileDrawerOpen}
          translateX={mobileDrawerX}
          onClose={closeDrawer}
        />
      )}
      <div
        className={`${hideSidebar ? "" : "md:ml-[100px]"} flex min-w-0 flex-1 ${
          mobileDrawerOpen ? "pointer-events-none select-none" : ""
        }`}
        aria-hidden={mobileDrawerOpen}
      >
        {children}
      </div>
      <AppMobileNav active={active} />
    </main>
  );
}

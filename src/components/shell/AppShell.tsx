 "use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AppBackground,
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

  useEffect(() => {
    if (!ready || user || isPublicRoute) return;
    router.replace("/");
  }, [ready, user, isPublicRoute, router]);

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
    <main className={mainClassName ?? defaultMainClass}>
      <AppBackground />
      {!hideSidebar && <AppSidebar active={active} />}
      <div className={`${hideSidebar ? "" : "md:ml-[100px]"} flex min-w-0 flex-1`}>
        {children}
      </div>
      <AppMobileNav active={active} />
    </main>
  );
}

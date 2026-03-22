import type { ReactNode } from "react";
import {
  AppBackground,
  AppMobileNav,
  AppSidebar,
  type AppNavActive,
} from "@/components/shell/AppSidebar";

/** `md:flex-row` is required — without it, sidebar stacks above content and wastes the whole top band. */
const defaultMainClass =
  "flex min-h-dvh min-h-[100svh] w-full max-w-[100vw] flex-col overflow-x-hidden bg-[#0a0e1a] text-white antialiased md:min-h-screen md:flex-row";

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
  return (
    <main className={mainClassName ?? defaultMainClass}>
      <AppBackground />
      {!hideSidebar && <AppSidebar active={active} />}
      {children}
      <AppMobileNav active={active} />
    </main>
  );
}

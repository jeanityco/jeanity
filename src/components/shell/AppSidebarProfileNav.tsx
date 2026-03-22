"use client";

import Link from "next/link";
import { usePostComposer } from "@/features/feeds/PostComposerModal";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
import { sidebarProfilePath } from "@/lib/profilePath";
import { shellRailOnLaunchClass, shellRailTileClass } from "@/lib/ui/appShellClasses";

/** Sidebar profile square — links to /@yourtag. */
export function SidebarProfileLink({ active }: { active: boolean }) {
  const { tag, ready } = useAuthSnapshot();
  const href = sidebarProfilePath(tag, ready);

  return (
    <Link
      href={href}
      prefetch={false}
      aria-label="Profile"
      title="Profile"
      className={`relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-3xl ${shellRailTileClass} ${
        active ? "ring-2 ring-white/25 ring-offset-[3px] ring-offset-[#080c14]" : ""
      }`}
    >
      <svg className={`h-7 w-7 ${shellRailOnLaunchClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
      </svg>
    </Link>
  );
}

/** Mobile bottom nav profile tab */
export function MobileProfileLink({ active }: { active: boolean }) {
  const { tag, ready } = useAuthSnapshot();
  const href = sidebarProfilePath(tag, ready);

  return (
    <Link
      href={href}
      prefetch={false}
      className={`flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-2xl transition active:scale-[0.98] ${active ? "bg-white/10 text-white ring-1 ring-white/10" : "text-slate-500"}`}
      aria-label="Profile"
      aria-current={active ? "page" : undefined}
    >
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
      </svg>
    </Link>
  );
}

export function AppSidebarPostButton() {
  const { openPost } = usePostComposer();
  return (
    <button
      type="button"
      onClick={() => openPost()}
      className={`flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-3xl ${shellRailTileClass}`}
      aria-label="New post"
      title="New post"
    >
      <svg className={`h-8 w-8 stroke-[2.25] ${shellRailOnLaunchClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>
  );
}

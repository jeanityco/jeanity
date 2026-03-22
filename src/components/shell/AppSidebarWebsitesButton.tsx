"use client";

import { useState } from "react";
import { CreateSpaceModal } from "@/features/spaces/CreateSpaceModal";
import {
  shellLaunchGradientClass,
  shellRailOnLaunchClass,
  shellRailTileClass,
} from "@/lib/ui/appShellClasses";

export function AppSidebarWebsitesButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add space"
        title="Add space"
        className={`flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-3xl ${shellRailTileClass}`}
      >
        <svg
          className={`h-7 w-7 ${shellRailOnLaunchClass}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
        </svg>
      </button>
      <CreateSpaceModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

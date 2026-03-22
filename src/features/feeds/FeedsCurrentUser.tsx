"use client";

import { useAuthSnapshot } from "@/lib/auth/AuthProvider";

export function FeedsCurrentUserHeader() {
  const { name, tag, ready } = useAuthSnapshot();

  return (
    <>
      <div className="min-w-0 max-w-[min(10rem,36vw)] flex-1 text-right md:hidden">
        <p className="truncate text-sm font-medium text-white">
          {ready ? name : ""}
        </p>
        <p className="truncate text-xs text-slate-500">{ready ? tag : ""}</p>
      </div>
      <div className="hidden min-w-0 max-w-[160px] text-right md:block xl:max-w-[220px]">
        <p className="truncate text-sm font-medium text-white">
          {ready ? name : ""}
        </p>
        <p className="truncate text-xs text-slate-500">{ready ? tag : ""}</p>
      </div>
    </>
  );
}

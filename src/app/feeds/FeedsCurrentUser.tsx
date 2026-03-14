"use client";

import { useAuthSnapshot } from "@/lib/auth/AuthProvider";

export function FeedsCurrentUserSidebar() {
  const { name, tag, avatarEmoji, avatarUrl, ready } = useAuthSnapshot();
  const displayName = ready ? name : "…";
  const displayTag = ready ? tag : "…";

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-lg leading-none ring-2 ring-white/10">
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : avatarEmoji ? (
          <span className="text-lg leading-none">{avatarEmoji}</span>
        ) : (
          <span className="text-sm font-semibold text-white/95">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{displayName}</p>
        <p className="truncate text-xs text-slate-400">{displayTag}</p>
      </div>
    </div>
  );
}

export function FeedsCurrentUserHeader() {
  const { name, tag, ready } = useAuthSnapshot();

  return (
    <>
      <div className="min-w-0 flex-1 text-center sm:text-right lg:hidden">
        <p className="truncate text-sm font-medium text-white">
          {ready ? name : ""}
        </p>
        <p className="truncate text-xs text-slate-500">{ready ? tag : ""}</p>
      </div>
      <div className="hidden min-w-0 max-w-[160px] text-right lg:block xl:max-w-[200px]">
        <p className="truncate text-sm font-medium text-white">
          {ready ? name : ""}
        </p>
        <p className="truncate text-xs text-slate-500">{ready ? tag : ""}</p>
      </div>
    </>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function MenuIconCircle({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-sky-500/15 ring-1 ring-emerald-400/25">
      {children}
    </span>
  );
}

function ChevronRight() {
  return (
    <svg className="h-4 w-4 shrink-0 text-sky-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function HeaderAccountMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  const onLogout = useCallback(async () => {
    setOpen(false);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  }, []);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 ring-2 ring-white/15 shadow-lg shadow-violet-500/20 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-sky-400/50 sm:h-10 sm:w-10 lg:h-11 lg:w-11"
      />

      {open && (
        <>
          <div className="fixed inset-0 z-40 sm:hidden" aria-hidden onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),300px)] min-w-[260px] overflow-hidden rounded-xl border border-emerald-500/20 bg-[#080c14] py-2 shadow-xl shadow-emerald-900/20 ring-1 ring-sky-500/10"
            style={{
              backgroundImage:
                "linear-gradient(165deg, rgba(6,78,59,0.35) 0%, #080c14 45%, rgba(12,74,110,0.2) 100%)",
            }}
            role="menu"
            aria-label="Account"
          >
            <ul className="px-2">
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-[15px] font-medium text-slate-100 transition hover:bg-emerald-500/15 hover:text-white"
                >
                  <MenuIconCircle>
                    <svg className="h-4 w-4 text-emerald-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                    </svg>
                  </MenuIconCircle>
                  <span className="min-w-0 flex-1">Display &amp; appearance</span>
                  <ChevronRight />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  onClick={onLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-[15px] font-medium text-slate-100 transition hover:bg-sky-500/15 hover:text-white"
                >
                  <MenuIconCircle>
                    <svg className="h-4 w-4 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </MenuIconCircle>
                  <span>Log out</span>
                </button>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

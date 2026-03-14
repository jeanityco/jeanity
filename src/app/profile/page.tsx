"use client";

import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
import {
  AppBackground,
  AppMobileNav,
  AppSidebar,
} from "@/components/AppSidebar";

export default function ProfilePage() {
  const { name, tag, avatarEmoji, avatarUrl, user, ready } = useAuthSnapshot();
  const email = user?.email ?? null;
  const bio =
    typeof user?.user_metadata?.bio === "string" ? user.user_metadata.bio : "";
  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white antialiased lg:flex">
      <AppBackground />
      <AppSidebar active="profile" />

      <div className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col pb-28 lg:pb-8">
        <div
          className="h-36 w-full sm:h-44 lg:h-52"
          style={{
            background:
              "linear-gradient(125deg, #7c3aed 0%, #db2777 40%, #f97316 70%, #22c55e 100%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-[#0a0e1a] bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-500 text-4xl shadow-xl ring-2 ring-emerald-400/30 sm:h-32 sm:w-32">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : avatarEmoji ? (
                <span className="text-4xl leading-none">{avatarEmoji}</span>
              ) : (
                <span className="text-2xl font-bold text-slate-950">
                  {(ready ? name : "…").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex gap-2 sm:mb-2 sm:pb-1">
              <Link
                href="/feeds"
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
              >
                View feeds
              </Link>
              <Link
                href="/"
                className="rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 px-4 py-2 text-sm font-bold text-slate-950"
              >
                Home
              </Link>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {ready ? name : "…"}
            </h1>
            <p className="text-sky-400/90">{ready ? tag : "…"}</p>
            {email && (
              <p className="text-sm text-slate-500">{email}</p>
            )}
            {joined && (
              <p className="text-xs text-slate-600">Joined {joined}</p>
            )}
          </div>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400">
            {bio || "No bio yet. Add one in Settings."}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border border-white/8 bg-[#0f1419] p-4 ring-1 ring-white/[0.06] sm:max-w-md">
            <div className="text-center">
              <p className="text-lg font-bold text-white">—</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Posts
              </p>
            </div>
            <div className="border-x border-white/10 text-center">
              <p className="text-lg font-bold text-white">—</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Followers
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">—</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Following
              </p>
            </div>
          </div>

          <section className="mt-8 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Account
            </p>
            <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/8 bg-white/[0.03]">
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-400">Notifications</span>
                <span className="text-slate-600">Soon</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-400">Privacy</span>
                <span className="text-slate-600">Soon</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-400">Sign out</span>
                <button
                  type="button"
                  className="text-rose-400/90 hover:text-rose-300"
                  onClick={() => void getSupabaseBrowserClient().auth.signOut()}
                >
                  Log out
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <AppMobileNav active="profile" />
    </main>
  );
}

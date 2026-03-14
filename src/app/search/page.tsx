import Link from "next/link";
import {
  AppBackground,
  AppMobileNav,
  AppSidebar,
} from "@/components/AppSidebar";
import { FeedsCurrentUserHeader } from "@/app/feeds/FeedsCurrentUser";
import { HeaderAccountMenu } from "@/components/HeaderAccountMenu";

const SUGGESTED = ["#jeanity", "#vibes", "#community", "#ranking", "#live"];

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white antialiased lg:flex">
      <AppBackground />
      <AppSidebar active="search" />

      <div className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col pb-28 pt-3 sm:pt-4 lg:pb-8 lg:pt-0">
        <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0a0e1a]/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8 lg:py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:gap-4">
              <button
                type="button"
                aria-label="Menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 lg:hidden"
              >
                <span className="flex flex-col gap-1">
                  <span className="h-0.5 w-4 rounded-full bg-white/80" />
                  <span className="h-0.5 w-4 rounded-full bg-white/80" />
                  <span className="h-0.5 w-4 rounded-full bg-white/80" />
                </span>
              </button>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl lg:text-2xl">
                  Search
                </h1>
                <p className="hidden text-xs text-slate-500 sm:block lg:text-sm">
                  People, tags, and vibes on Jeanity
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 lg:flex-initial lg:gap-4">
              <FeedsCurrentUserHeader />
              <HeaderAccountMenu />
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="relative mb-8">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sky-400/80">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search Jeanity…"
              className="w-full rounded-2xl border border-emerald-500/20 bg-slate-900/60 py-3.5 pl-12 pr-4 text-sm text-slate-100 shadow-inner placeholder:text-slate-500 focus:border-sky-400/50 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>

          <section className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Suggested
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 ring-1 ring-white/5">
            <div className="mb-2 h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400/30 to-sky-400/30" />
            <p className="font-medium text-slate-200">Start searching</p>
            <p className="mt-1 text-sm text-slate-500">
              Find creators, communities, and trending conversations. Results will show here once search is connected.
            </p>
            <Link
              href="/feeds"
              className="mt-4 inline-flex rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 px-5 py-2 text-sm font-bold text-slate-950"
            >
              Back to Feeds
            </Link>
          </section>
        </div>
      </div>

      <AppMobileNav active="search" />
    </main>
  );
}

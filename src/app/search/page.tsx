import Link from "next/link";
import { AppPageHeader } from "@/components/shell/AppPageHeader";
import { AppShell } from "@/components/shell/AppShell";
import { FeedsCurrentUserHeader } from "@/features/feeds/FeedsCurrentUser";
import { HeaderAccountMenu } from "@/components/shell/HeaderAccountMenu";
import { shellMainColumn } from "@/lib/ui/appShellClasses";

const SUGGESTED = ["#jeanity", "#vibes", "#community", "#ranking", "#live"];

export default function SearchPage() {
  return (
    <AppShell active="search">
      <div className={shellMainColumn}>
        <AppPageHeader
          title="Search"
          subtitle="People, tags, and vibes on Jeanity"
          trailing={
            <>
              <FeedsCurrentUserHeader />
              <HeaderAccountMenu />
            </>
          }
        />

        <div className="mx-auto w-full max-w-3xl flex-1 px-3 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
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
              prefetch={false}
              className="mt-4 inline-flex rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 px-5 py-2 text-sm font-bold text-slate-950"
            >
              Back to Feeds
            </Link>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import {
  FeedsCurrentUserHeader,
} from "@/features/feeds/FeedsCurrentUser";
import { FeedsPostList } from "@/features/feeds/FeedsPostList";
import { FeedsRankingList } from "@/features/feeds/FeedsRankingList";
import { useMemo, useState } from "react";
import { AppPageHeader } from "@/components/shell/AppPageHeader";
import { AppShell } from "@/components/shell/AppShell";
import { HeaderAccountMenu } from "@/components/shell/HeaderAccountMenu";
import { usePostComposer } from "@/features/feeds/PostComposerModal";
import { useStoryViewer } from "@/features/feeds/StoryViewer";
import { useFeedsPosts } from "@/features/feeds/FeedsPostsContext";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
import { normalizeUserTag } from "@/lib/profilePath";
import { shellMainColumn } from "@/lib/ui/appShellClasses";

const TABS = ["Feeds", "Ranking", "Community"] as const;
type FeedTab = (typeof TABS)[number];

/** Story avatar shape: square with rounded corners */
const STORY_AVATAR_SHAPE = "rounded-xl";

const STORY_GRADS = [
  "linear-gradient(90deg,#0f766e,#134e4a 35%,#22d3ee)", // teal → cyan (reference)
  "linear-gradient(90deg,#be185d,#f472b6,#fb923c)",
  "linear-gradient(90deg,#047857,#34d399,#22d3ee)",
  "linear-gradient(90deg,#6d28d9,#a78bfa,#ec4899)",
  "linear-gradient(90deg,#b45309,#fbbf24,#f97316)",
  "linear-gradient(90deg,#0f7669,#2dd4bf,#3b82f6)",
  "linear-gradient(90deg,#7c3aed,#c084fc,#f472b6)",
  "linear-gradient(90deg,#0369a1,#38bdf8,#818cf8)",
];

function StoryDiamond({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rotate-45 bg-white shadow-sm ${className}`}
      aria-hidden
    />
  );
}

export default function FeedsPage() {
  const [tab, setTab] = useState<FeedTab>("Feeds");
  const { openStory } = usePostComposer();
  const { openViewer } = useStoryViewer();
  const { posts, postsLoading } = useFeedsPosts();
  const { name, tag, avatarUrl, avatarEmoji, ready } = useAuthSnapshot();
  const storyInitial = ready ? name.charAt(0).toUpperCase() || "?" : "…";

  const myStories = useMemo(() => {
    const t = normalizeUserTag(tag);
    return posts.filter((p) => p.surface === "Story" && p.authorTag === t);
  }, [posts, tag]);

  const onYourStoryClick = () => {
    if (myStories.length > 0) {
      openViewer(myStories, 0);
    } else {
      openStory();
    }
  };
  const headerTitle = tab === "Feeds" ? "Feeds" : tab === "Ranking" ? "Ranking" : "Community";
  const headerSubtitle =
    tab === "Feeds"
      ? "Stories, communities, and what's trending"
      : tab === "Ranking"
        ? "Top tools and creators on Jeanity"
        : "Spaces and people you can join";

  return (
    <AppShell active="feeds">
      <div className={shellMainColumn}>
        <AppPageHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          trailing={
            <>
              <FeedsCurrentUserHeader />
              <HeaderAccountMenu />
            </>
          }
        />

        {/* Content grid: main + optional right rail on xl */}
        <div className="mx-auto flex w-full max-w-6xl gap-6 px-3 py-4 sm:gap-8 sm:px-6 sm:py-5 md:px-8 md:py-6 xl:gap-10">
          <div className="min-w-0 flex-1 space-y-6 lg:space-y-8">
            {tab === "Feeds" && (
            <>
            {/* Stories: squircle tiles (teal→cyan + diamond), scroll mobile */}
            <section className="scrollbar-hide -mx-1 overflow-x-auto overflow-y-visible pb-3 pt-0.5 md:overflow-visible md:pb-2 md:pt-0">
              <div className="flex w-max gap-3 px-1 sm:gap-4 md:w-full md:flex-wrap md:gap-5">
                <button
                  type="button"
                  aria-label="Add your story"
                  onClick={onYourStoryClick}
                  className="flex w-[72px] flex-col items-center gap-2.5 overflow-visible rounded-xl border-0 bg-transparent p-0 pb-0.5 text-left lg:w-[80px] lg:gap-3"
                >
                  <div
                    className={`relative flex h-[68px] w-[68px] items-center justify-center overflow-visible border-2 border-dashed border-white/20 bg-white/[0.03] p-[3px] transition hover:border-emerald-400/40 hover:bg-white/[0.06] lg:h-20 lg:w-20 ${STORY_AVATAR_SHAPE}`}
                  >
                    <div
                      className={`relative h-full w-full overflow-hidden shadow-inner ring-1 ring-white/10 ${STORY_AVATAR_SHAPE}`}
                    >
                      {/* Current user avatar */}
                      {avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={avatarUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-teal-800 via-teal-700 to-cyan-400 text-2xl leading-none lg:text-3xl"
                          aria-hidden
                        >
                          {avatarEmoji ? (
                            <span className="scale-110">{avatarEmoji}</span>
                          ) : (
                            <span className="text-lg font-bold text-white/95 lg:text-xl">
                              {storyInitial}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* + on border — same surface as post comment buttons */}
                    <span
                      className="pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-[42%]"
                      aria-hidden
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[11px] font-light leading-none text-white shadow-md backdrop-blur-sm lg:h-6 lg:w-6 lg:text-xs">
                        +
                      </span>
                    </span>
                  </div>
                  <span className="text-center text-[10px] font-medium text-slate-400 lg:text-xs">Your Story</span>
                </button>
                {STORY_GRADS.map((grad, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Story ${i + 1}`}
                    className="flex w-[68px] shrink-0 flex-col items-center gap-2 lg:w-20"
                  >
                    <div
                      className={`flex h-[68px] w-[68px] items-center justify-center shadow-md ring-1 ring-white/15 lg:h-20 lg:w-20 ${STORY_AVATAR_SHAPE}`}
                      style={{ backgroundImage: grad }}
                    >
                      <StoryDiamond className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
            </>
            )}

            {/* Tabs: wider, readable on desktop */}
            <nav className="flex max-w-2xl items-center gap-1 rounded-2xl bg-white/[0.04] p-1.5 ring-1 ring-white/5 backdrop-blur-md lg:p-2">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex flex-1 justify-center rounded-full py-2.5 text-center text-[11px] font-semibold sm:text-sm lg:py-3 lg:text-base transition ${
                    tab === t
                      ? "bg-[#1e3a5f]/90 text-white shadow-[0_0_24px_rgba(56,189,248,0.12)] ring-1 ring-sky-500/30"
                      : "cursor-pointer text-slate-500 hover:bg-white/[0.06] hover:text-slate-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>

            {tab === "Ranking" && <FeedsRankingList />}

            {tab === "Community" && (
              <section className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 text-center ring-1 ring-white/5">
                <h2 className="text-lg font-semibold text-white">Community</h2>
                <p className="mt-2 text-sm text-slate-500">Browse spaces and members—coming soon.</p>
              </section>
            )}

            {tab === "Feeds" && (
            <>
            {/* Hero: stacked mobile, horizontal on lg */}
            <section
              className="relative overflow-hidden rounded-[24px] shadow-[0_24px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/10 lg:rounded-[28px]"
              style={{
                background: "linear-gradient(125deg, #7c3aed 0%, #db2777 35%, #f97316 65%, #22c55e 100%)",
              }}
            >
              <div className="pointer-events-none absolute inset-0 bg-black/10" />
              <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:p-10">
                <div className="relative mx-auto h-28 w-full max-w-[220px] shrink-0 lg:mx-0 lg:h-36 lg:w-48 lg:max-w-none">
                  <div className="absolute left-0 top-0 h-14 w-14 rounded-full border-2 border-white/40 bg-gradient-to-br from-amber-200 to-orange-400 shadow-lg lg:h-16 lg:w-16" />
                  <div className="absolute bottom-0 left-8 h-11 w-11 rounded-full border-2 border-white/40 bg-gradient-to-br from-pink-300 to-rose-500 shadow-lg lg:left-10 lg:h-14 lg:w-14" />
                  <div className="absolute right-4 top-2 h-12 w-12 rounded-full border-2 border-white/40 bg-gradient-to-br from-sky-300 to-indigo-500 shadow-lg lg:right-6 lg:h-14 lg:w-14" />
                  <div className="absolute bottom-1 right-0 h-16 w-16 rounded-full border-2 border-white/40 bg-gradient-to-br from-fuchsia-300 to-purple-600 shadow-lg lg:h-[4.5rem] lg:w-[4.5rem]" />
                </div>
                <div className="flex flex-1 flex-col items-center gap-4 text-center lg:items-start lg:text-left">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-3xl lg:text-4xl">VibeHive</h2>
                    <p className="mt-1 text-sm font-medium text-white/90 lg:text-base">Community</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-2xl border border-white/20 bg-black/35 px-8 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-black/45 lg:text-base"
                  >
                    Join now
                  </button>
                </div>
              </div>
            </section>

            {/* Trending + Discover intro */}
            <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
              <section className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur-sm lg:p-6">
                <p className="text-sm font-medium text-slate-300 lg:text-base">Trending on Jeanity</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 lg:text-sm">
                  Your feed will fill with vibes from people and spaces you follow.
                </p>
              </section>
              <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 lg:p-6">
                <p className="text-sm font-medium text-slate-400 lg:text-base">Discover</p>
                <p className="mt-2 text-xs text-slate-600 lg:text-sm">
                  Groups and trending tags—scroll for posts from the community.
                </p>
              </section>
            </div>

            {/* Posts (under Discover row) */}
            {postsLoading ? (
              <div className="space-y-5 lg:space-y-6" aria-busy="true" aria-label="Loading posts">
                {[1, 2, 3].map((i) => (
                  <article
                    key={i}
                    className="overflow-hidden rounded-2xl border border-white/8 bg-[#0f1419] ring-1 ring-white/[0.06]"
                  >
                    <div className="flex items-start gap-3 p-4 pb-3 sm:p-5">
                      <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-white/10 sm:h-12 sm:w-12" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                        <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
                        <div className="h-3 w-full max-w-sm animate-pulse rounded bg-white/5" />
                      </div>
                    </div>
                    <div className="aspect-video w-full animate-pulse bg-white/5" />
                  </article>
                ))}
              </div>
            ) : (
              <FeedsPostList />
            )}
            </>
            )}
          </div>

          {/* Right rail: xl only — scrollable so it isn’t clipped above the fold */}
          <aside className="hidden w-72 min-w-0 shrink-0 self-start xl:block">
            <div className="sticky top-20 z-[5] max-h-[calc(100dvh-5.5rem)] space-y-4 overflow-y-auto overscroll-y-contain rounded-2xl border border-white/5 bg-white/[0.03] p-5 pb-6 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">For you</p>
              <p className="text-sm leading-relaxed text-slate-400">
                Suggestions and activity will appear here.
              </p>
              <div className="space-y-2 pt-1">
                {["#welcome", "#feeds", "#community"].map((tag) => (
                  <div
                    key={tag}
                    className="rounded-xl bg-white/5 px-3 py-2.5 text-xs text-slate-400 ring-1 ring-white/5"
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

      </div>
    </AppShell>
  );
}

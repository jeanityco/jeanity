"use client";

import {
  FeedsCurrentUserHeader,
} from "@/features/feeds/FeedsCurrentUser";
import { FeedsPostList } from "@/features/feeds/FeedsPostList";
import {
  FeedsRankingList,
  RankingProductRow,
  RANKING_PERIODS,
  type RankingPeriod,
} from "@/features/feeds/FeedsRankingList";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AppPageHeader } from "@/components/shell/AppPageHeader";
import { AppShell } from "@/components/shell/AppShell";
import { HeaderAccountMenu } from "@/components/shell/HeaderAccountMenu";
import { usePostComposer } from "@/features/feeds/PostComposerModal";
import { useStoryViewer } from "@/features/feeds/StoryViewer";
import { useFeedsPosts } from "@/features/feeds/FeedsPostsContext";
import { CreateSpaceModal } from "@/features/spaces/CreateSpaceModal";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
import { normalizeUserTag } from "@/lib/profilePath";
import type { FeedPost } from "@/features/feeds/feedPostTypes";
import { shellLaunchGradientClass, shellMainColumn } from "@/lib/ui/appShellClasses";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/client";

type PublicSpace = {
  id: string;
  code: string;
  name: string;
  icon_url: string | null;
  created_at?: string | null;
};

const TABS = ["Feeds", "Ranking", "Spaces"] as const;
type FeedTab = (typeof TABS)[number];

/** Story avatar shape: square with rounded corners. */
const STORY_AVATAR_SHAPE = "rounded-xl";

export default function FeedsPage() {
  const [tab, setTab] = useState<FeedTab>("Feeds");
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const storiesScrollRef = useRef<HTMLDivElement>(null);
  const [storiesCanScrollLeft, setStoriesCanScrollLeft] = useState(false);
  const [storiesCanScrollRight, setStoriesCanScrollRight] = useState(false);
  const [publicSpaces, setPublicSpaces] = useState<PublicSpace[]>([]);
  const [publicSpacesLoading, setPublicSpacesLoading] = useState(false);
  const [railSpaces, setRailSpaces] = useState<PublicSpace[]>([]);
  const [rankingPeriod, setRankingPeriod] = useState<RankingPeriod>("Daily");
  const { openStory } = usePostComposer();
  const { openViewer } = useStoryViewer();
  const { posts, postsLoading, products, upvoteProduct } = useFeedsPosts();
  const [railUpvotingIds, setRailUpvotingIds] = useState<Set<string>>(new Set());
  const { name, tag, avatarUrl, avatarEmoji, ready } = useAuthSnapshot();
  const storyInitial = ready ? name.charAt(0).toUpperCase() || "?" : "…";

  const myStories = useMemo(() => {
    const t = normalizeUserTag(tag);
    return posts.filter((p) => p.surface === "Story" && p.authorTag === t);
  }, [posts, tag]);

  /** Other people’s stories: one tile per author, feed order (newest-first in `posts`). */
  const peerStoryGroups = useMemo(() => {
    const me = normalizeUserTag(tag);
    const storyPosts = posts.filter((p) => p.surface === "Story");
    const byAuthor = new Map<string, FeedPost[]>();
    for (const p of storyPosts) {
      const t = normalizeUserTag(p.authorTag);
      if (t === me) continue;
      const list = byAuthor.get(t);
      if (list) list.push(p);
      else byAuthor.set(t, [p]);
    }
    const groups: { stories: FeedPost[] }[] = [];
    const seen = new Set<string>();
    for (const p of storyPosts) {
      const t = normalizeUserTag(p.authorTag);
      if (t === me || seen.has(t)) continue;
      seen.add(t);
      const list = byAuthor.get(t);
      if (list?.length) groups.push({ stories: list });
    }
    return groups;
  }, [posts, tag]);

  const rightRailTopRanking = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        const scoreA = 1.0 * a.upvotes + 1.8 * a.comments;
        const scoreB = 1.0 * b.upvotes + 1.8 * b.comments;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 3);
  }, [products]);

  const onRailUpvote = (productId: string) => {
    if (railUpvotingIds.has(productId)) return;
    setRailUpvotingIds((prev) => new Set(prev).add(productId));
    void upvoteProduct(productId).finally(() => {
      setRailUpvotingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    });
  };

  const onYourStoryClick = () => {
    if (myStories.length > 0) {
      openViewer(myStories, 0);
    } else {
      openStory();
    }
  };

  const updateStoriesScrollState = useCallback(() => {
    const el = storiesScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    const left = scrollLeft > 4;
    const right = max > 4 && scrollLeft < max - 4;
    // Defer: ResizeObserver can fire synchronously during observe(); avoid setState in that flush (React 19 / Next 16).
    queueMicrotask(() => {
      setStoriesCanScrollLeft(left);
      setStoriesCanScrollRight(right);
    });
  }, []);

  useEffect(() => {
    if (tab !== "Spaces") return;
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) {
      setPublicSpaces([]);
      setPublicSpacesLoading(false);
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPublicSpacesLoading(true);
    });

    // Handle older/newer schemas gracefully (missing is_public/created_at causes 400).
    void (async () => {
      const primary = await supabase
        .from("spaces")
        .select("id, code, name, icon_url, created_at")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(24);

      if (!primary.error) {
        if (!cancelled) {
          setPublicSpaces((primary.data ?? []) as PublicSpace[]);
          setPublicSpacesLoading(false);
        }
        return;
      }

      const fallback = await supabase
        .from("spaces")
        .select("id, code, name, icon_url")
        .order("name", { ascending: true })
        .limit(24);

      if (!cancelled) {
        setPublicSpaces((fallback.data ?? []) as PublicSpace[]);
        setPublicSpacesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "Feeds") return;
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) {
      setRailSpaces([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("spaces")
        .select("id, code, name, icon_url, created_at")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (!cancelled) {
        setRailSpaces((data ?? []) as PublicSpace[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    updateStoriesScrollState();
    const el = storiesScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateStoriesScrollState);
    ro.observe(el);
    el.addEventListener("scroll", updateStoriesScrollState, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateStoriesScrollState);
    };
  }, [updateStoriesScrollState, tab, posts.length, peerStoryGroups.length]);

  const scrollStoriesBy = (delta: number) => {
    storiesScrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };
  const headerTitle = tab === "Feeds" ? "Feeds" : tab === "Ranking" ? "Ranking" : "Spaces";
  const headerSubtitle =
    tab === "Feeds"
      ? "Discover, react, follow, and go deeper"
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
        <div className="mx-auto flex w-full max-w-7xl gap-6 px-3 py-4 sm:gap-8 sm:px-6 sm:py-5 md:px-8 md:py-6 xl:gap-10 xl:pr-[22rem]">
          <div className="min-w-0 flex-[1.45] space-y-6 lg:space-y-8">
            {tab === "Feeds" && (
            <>
            {/* Stories: single horizontal row; overflow shows left/right scroll controls */}
            <div className="relative -mx-1 pb-3 pt-0.5 md:pb-2 md:pt-0">
              {storiesCanScrollLeft && (
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 z-[24] w-11 bg-gradient-to-r from-[#050505] via-[#050505]/88 to-transparent sm:w-12"
                  aria-hidden
                />
              )}
              {storiesCanScrollLeft && (
                <button
                  type="button"
                  aria-label="Scroll stories left"
                  onClick={() =>
                    scrollStoriesBy(
                      -Math.min(280, storiesScrollRef.current?.clientWidth ?? 280) * 0.65
                    )
                  }
                  className="absolute left-1 top-1/2 z-[30] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#0f1419]/95 text-lg text-white shadow-lg backdrop-blur-sm transition hover:bg-[#1a2332] hover:border-white/25 lg:h-10 lg:w-10"
                >
                  ‹
                </button>
              )}
              {storiesCanScrollRight && (
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 z-[24] w-11 bg-gradient-to-l from-[#050505] via-[#050505]/88 to-transparent sm:w-12"
                  aria-hidden
                />
              )}
              {storiesCanScrollRight && (
                <button
                  type="button"
                  aria-label="Scroll stories right"
                  onClick={() =>
                    scrollStoriesBy(
                      Math.min(280, storiesScrollRef.current?.clientWidth ?? 280) * 0.65
                    )
                  }
                  className="absolute right-1 top-1/2 z-[30] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#0f1419]/95 text-lg text-white shadow-lg backdrop-blur-sm transition hover:bg-[#1a2332] hover:border-white/25 lg:h-10 lg:w-10"
                >
                  ›
                </button>
              )}
              <section
                ref={storiesScrollRef}
                className="relative z-0 scrollbar-hide overflow-x-auto overflow-y-visible px-1"
              >
                <div className="flex w-max flex-nowrap gap-3 sm:gap-4 md:gap-5">
                <div className="flex w-[80px] flex-col items-center gap-2.5 overflow-visible pb-0.5 lg:w-[92px] lg:gap-3">
                  <div className="relative h-[76px] w-[76px] lg:h-[88px] lg:w-[88px]">
                    <button
                      type="button"
                      aria-label={
                        myStories.length > 0 ? "View your story" : "Add your story"
                      }
                      onClick={onYourStoryClick}
                      className={`relative flex h-full w-full items-center justify-center overflow-visible border-2 border-dashed border-white/20 bg-white/[0.03] p-[3px] transition hover:border-emerald-400/40 hover:bg-white/[0.06] ${STORY_AVATAR_SHAPE}`}
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
                            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-teal-800 via-teal-700 to-cyan-400 text-[1.65rem] leading-none lg:text-4xl"
                            aria-hidden
                          >
                            {avatarEmoji ? (
                              <span className="scale-110">{avatarEmoji}</span>
                            ) : (
                              <span className="text-xl font-bold text-white/95 lg:text-2xl">
                                {storyInitial}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                    {/* + always opens story composer, even when a story is already posted */}
                    <button
                      type="button"
                      aria-label="Create new story"
                      onClick={() => openStory()}
                      className="absolute bottom-0 left-1/2 z-[1] flex h-5 w-5 -translate-x-1/2 translate-y-[42%] items-center justify-center rounded-full border border-white/15 bg-white/10 text-[11px] font-light leading-none text-white shadow-md backdrop-blur-sm transition hover:bg-white/15 sm:h-6 sm:w-6 lg:h-7 lg:w-7 lg:text-xs"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onYourStoryClick}
                    className="border-0 bg-transparent p-0 text-center text-[10px] font-medium text-slate-400 hover:text-slate-300 lg:text-xs"
                  >
                    Your Story
                  </button>
                </div>
                {peerStoryGroups.map(({ stories }) => {
                  const preview = stories[0];
                  const shortLabel =
                    preview.authorName?.trim().split(/\s+/)[0] ||
                    preview.authorTag.replace(/^@/, "");
                  return (
                    <button
                      key={normalizeUserTag(preview.authorTag)}
                      type="button"
                      aria-label={`${preview.authorName} story`}
                      onClick={() => openViewer(stories, 0)}
                      className="flex w-[76px] shrink-0 flex-col items-center gap-2 lg:w-[88px]"
                    >
                      <div
                        className={`relative flex h-[76px] w-[76px] items-center justify-center overflow-hidden shadow-md ring-1 ring-white/15 lg:h-[88px] lg:w-[88px] ${STORY_AVATAR_SHAPE}`}
                      >
                        {preview.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={preview.imageUrl}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : preview.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={preview.avatarUrl}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 text-[1.35rem] leading-none lg:text-2xl"
                            aria-hidden
                          >
                            {preview.avatarEmoji ? (
                              <span>{preview.avatarEmoji}</span>
                            ) : (
                              <span className="text-lg font-bold text-white/90 lg:text-xl">
                                {(preview.authorName || preview.authorTag).charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="max-w-full truncate px-0.5 text-center text-[10px] font-medium text-slate-400 lg:text-xs">
                        {shortLabel}
                      </span>
                    </button>
                  );
                })}
                </div>
              </section>
            </div>
            </>
            )}

            {/* Tabs: equal-width and wider on desktop */}
            <nav className="grid w-full max-w-4xl grid-cols-3 gap-1.5 rounded-2xl bg-white/[0.04] p-2 ring-1 ring-white/5 backdrop-blur-md lg:p-2.5">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex h-12 w-full min-w-0 items-center justify-center rounded-full px-5 text-center text-sm font-semibold transition lg:h-14 lg:text-base ${
                    tab === t
                      ? "bg-[#1e3a5f]/90 text-white shadow-[0_0_24px_rgba(56,189,248,0.12)] ring-1 ring-sky-500/30"
                      : "cursor-pointer text-slate-500 hover:bg-white/[0.06] hover:text-slate-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>

            {tab === "Ranking" && <FeedsRankingList period={rankingPeriod} />}

            {tab === "Spaces" && (
              <section className="space-y-4">
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 ring-1 ring-white/5">
                  <h2 className="text-lg font-semibold text-white">Public spaces</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Join active public spaces across Jeanity.
                  </p>
                </div>
                {publicSpacesLoading ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 text-center ring-1 ring-white/5">
                    <p className="text-sm text-slate-500">Loading spaces…</p>
                  </div>
                ) : publicSpaces.length === 0 ? (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 text-center ring-1 ring-white/5">
                    <p className="text-sm text-slate-500">No public spaces yet.</p>
                  </div>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {publicSpaces.map((space) => (
                      <li key={space.id}>
                        <article className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-[#0f1419] ring-1 ring-white/[0.08]">
                          {space.icon_url ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={space.icon_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                              <div className="absolute inset-0 bg-black/45" />
                            </>
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-[linear-gradient(145deg,#1b2f4a_0%,#193a39_46%,#132131_100%)]" />
                              <div className="absolute inset-0 bg-black/35" />
                            </>
                          )}

                          <div className="relative p-4 sm:p-5">
                            <div className="flex items-start gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-black/30 ring-1 ring-white/15">
                                {space.icon_url ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={space.icon_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-sm font-bold text-white">
                                    {space.name.charAt(0).toUpperCase() || "S"}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[1.35rem] font-bold tracking-tight text-white">{space.name}</p>
                                <p className="text-sm text-white/75">/{space.code}</p>
                              </div>
                            </div>

                            <p className="mt-4 line-clamp-2 text-base leading-relaxed text-white/90">
                              Welcome to {space.name}. Join the conversation, updates, and creator vibes on Jeanity.
                            </p>

                            <div className="mt-5 flex items-center justify-end gap-2">
                              <Link
                                href={`/invite/${space.code}`}
                                prefetch={false}
                                className="rounded-2xl border border-white/15 bg-white/20 px-4 py-2 text-lg font-semibold text-white backdrop-blur-sm transition hover:bg-white/30"
                              >
                                Join
                              </Link>
                            </div>
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {tab === "Feeds" && (
            <>
            {/* Hero: create space — matches app chrome (#0f1419, teal/sky accents) */}
            <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0f1419] shadow-[0_24px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.06] lg:rounded-[28px]">
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-950/35 via-[#0f1419] to-sky-950/25"
                aria-hidden
              />
              <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" aria-hidden />
              <div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl" aria-hidden />
              <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:p-10">
                <div className="relative mx-auto h-28 w-full max-w-[220px] shrink-0 lg:mx-0 lg:h-36 lg:w-48 lg:max-w-none">
                  <div className="absolute left-0 top-0 h-14 w-14 rounded-full border border-white/15 bg-gradient-to-br from-teal-600/90 to-cyan-700/80 shadow-lg ring-1 ring-white/10 lg:h-16 lg:w-16" />
                  <div className="absolute bottom-0 left-8 h-11 w-11 rounded-full border border-white/15 bg-gradient-to-br from-sky-600/85 to-indigo-800/70 shadow-lg ring-1 ring-white/10 lg:left-10 lg:h-14 lg:w-14" />
                  <div className="absolute right-4 top-2 h-12 w-12 rounded-full border border-white/15 bg-gradient-to-br from-emerald-700/80 to-teal-900/70 shadow-lg ring-1 ring-white/10 lg:right-6 lg:h-14 lg:w-14" />
                  <div className="absolute bottom-1 right-0 h-16 w-16 rounded-full border border-white/15 bg-gradient-to-br from-slate-600/90 to-slate-900/80 shadow-lg ring-1 ring-white/10 lg:h-[4.5rem] lg:w-[4.5rem]" />
                </div>
                <div className="flex flex-1 flex-col items-center gap-4 text-center lg:items-start lg:text-left">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                      Create a space
                    </h2>
                    <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-400 lg:text-base">
                      Start a home for your crew—channels, updates, and vibes in one place on Jeanity.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateSpaceOpen(true)}
                    className={`rounded-full px-8 py-3 text-sm font-bold text-slate-950 transition hover:brightness-110 lg:text-base ${shellLaunchGradientClass}`}
                  >
                    Create space
                  </button>
                </div>
              </div>
            </section>

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
          <aside className="hidden w-80 min-w-0 shrink-0 self-start xl:fixed xl:right-6 xl:top-24 xl:block">
            <div className="space-y-3">
              {tab === "Ranking" ? (
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 pb-6 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ranking window
                  </p>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Choose the time range for top products.
                  </p>
                  <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-[#0f1419] p-1">
                    {RANKING_PERIODS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setRankingPeriod(p)}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          rankingPeriod === p
                            ? "bg-[#1e3a5f]/90 text-white ring-1 ring-sky-500/35"
                            : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-sm">
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
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Trending
                    </p>
                    {rightRailTopRanking.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">No rankings yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {rightRailTopRanking.map((item, idx) => (
                          <RankingProductRow
                            key={item.id}
                            product={item}
                            rank={idx + 1}
                            period={rankingPeriod}
                            onUpvote={onRailUpvote}
                            pending={railUpvotingIds.has(item.id)}
                            showUpvoteIcon={false}
                            upvoteInteractive={false}
                            compact
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Spaces to join
                    </p>
                    {railSpaces.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">No spaces yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {railSpaces.map((space) => (
                          <li key={space.id}>
                            <article className="relative overflow-hidden rounded-xl border border-amber-400/30 bg-[#0f1419] ring-1 ring-white/[0.08]">
                              {space.icon_url ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={space.icon_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                                  <div className="absolute inset-0 bg-black/45" />
                                </>
                              ) : (
                                <>
                                  <div className="absolute inset-0 bg-[linear-gradient(145deg,#1b2f4a_0%,#193a39_46%,#132131_100%)]" />
                                  <div className="absolute inset-0 bg-black/35" />
                                </>
                              )}
                              <div className="relative p-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-black/30 ring-1 ring-white/15">
                                    {space.icon_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={space.icon_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <span className="text-sm font-bold text-white">
                                        {space.name.charAt(0).toUpperCase() || "S"}
                                      </span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-base font-bold tracking-tight text-white">{space.name}</p>
                                    <p className="text-xs text-white/75">/{space.code}</p>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center justify-end">
                                  <Link
                                    href={`/invite/${space.code}`}
                                    prefetch={false}
                                    className="rounded-xl border border-white/15 bg-white/20 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/30"
                                  >
                                    Join
                                  </Link>
                                </div>
                              </div>
                            </article>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>

      </div>
      <CreateSpaceModal open={createSpaceOpen} onClose={() => setCreateSpaceOpen(false)} />
    </AppShell>
  );
}

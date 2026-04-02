 "use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppPageHeader } from "@/components/shell/AppPageHeader";
import { AppShell } from "@/components/shell/AppShell";
import { FeedsCurrentUserHeader } from "@/features/feeds/FeedsCurrentUser";
import { HeaderAccountMenu } from "@/components/shell/HeaderAccountMenu";
import { shellMainColumn } from "@/lib/ui/appShellClasses";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useFeedsPosts } from "@/features/feeds/FeedsPostsContext";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
import { searchAll, type SearchPost, type SearchSpace, type SearchUser } from "@/lib/search/searchAll";
import {
  PostsSection,
  SpacesSection,
  TrendingSection,
  UsersSection,
} from "@/features/search/SearchSections";
import { RankingProductRow } from "@/features/feeds/FeedsRankingList";

const DEBOUNCE_MS = 350;

export default function SearchPage() {
  const router = useRouter();
  const { user } = useAuthSnapshot();
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseBrowserClient> | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [postResults, setPostResults] = useState<SearchPost[]>([]);
  const [spaceResults, setSpaceResults] = useState<SearchSpace[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [suggestedUsers, setSuggestedUsers] = useState<SearchUser[]>([]);
  const [suggestedSpaces, setSuggestedSpaces] = useState<SearchSpace[]>([]);
  const { products } = useFeedsPosts();

  // Avoid build-time prerender failures when Supabase env isn't configured yet.
  // (Client components are still rendered once on the server during `next build`.)
  useEffect(() => {
    setSupabase(getSupabaseBrowserClient());
  }, []);

  const trendingTags = useMemo(
    () =>
      Array.from(
        new Set(
          [...products]
            .flatMap((p) => p.categories ?? [])
            .map((x) => x.toLowerCase().trim())
            .filter(Boolean)
        )
      )
        .sort((a, b) => {
          const countA = products.reduce((acc, p) => acc + ((p.categories ?? []).includes(a) ? 1 : 0), 0);
          const countB = products.reduce((acc, p) => acc + ((p.categories ?? []).includes(b) ? 1 : 0), 0);
          return countB - countA;
        })
        .slice(0, 5),
    [products]
  );

  const topProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => {
          const scoreA = a.upvotes + a.comments * 1.8;
          const scoreB = b.upvotes + b.comments * 1.8;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .slice(0, 3),
    [products]
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    if (!supabase) return () => {};
    if (!debouncedQuery) {
      queueMicrotask(() => {
        if (cancelled) return;
        setUserResults([]);
        setPostResults([]);
        setSpaceResults([]);
        setLoading(false);
      });
      return;
    }
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    void searchAll(supabase, debouncedQuery).then((res) => {
      if (cancelled) return;
      setUserResults(res.users);
      setPostResults(res.posts);
      setSpaceResults(res.spaces);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, supabase]);

  useEffect(() => {
    let cancelled = false;
    if (!supabase) return () => {};
    void (async () => {
      const [{ data: users }, { data: spaces }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, bio")
          .limit(5),
        supabase
          .from("spaces")
          .select("id, code, name, icon_url")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      if (cancelled) return;
      const spaceRows = (spaces ?? []) as { id: string; code: string; name: string; icon_url: string | null }[];
      const memberCounts = await Promise.all(
        spaceRows.map(async (row) => {
          const { count } = await supabase
            .from("space_members")
            .select("user_id", { count: "exact", head: true })
            .eq("space_id", row.id);
          return { id: row.id, count: count ?? 0 };
        })
      );
      const membersBySpace = new Map(memberCounts.map((x) => [x.id, x.count]));
      setSuggestedUsers(
        ((users ?? []) as SearchUser[]).map((u) => ({
          ...u,
          followers: 0,
        }))
      );
      setSuggestedSpaces(
        spaceRows.map((s) => ({
          ...s,
          members: membersBySpace.get(s.id) ?? 0,
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const hasQuery = debouncedQuery.length > 0;
  const hasQueryResults =
    userResults.length > 0 || postResults.length > 0 || spaceResults.length > 0;

  const visibleUsers = useMemo(
    () => (hasQuery ? userResults : suggestedUsers).slice(0, 5),
    [hasQuery, userResults, suggestedUsers]
  );

  useEffect(() => {
    if (!supabase) return;
    if (!user?.id || visibleUsers.length === 0) {
      queueMicrotask(() => setFollowingIds(new Set()));
      return;
    }
    let cancelled = false;
    const ids = visibleUsers.map((u) => u.id);
    void supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", ids)
      .then(({ data }: { data: { following_id: string }[] | null }) => {
        if (cancelled) return;
        setFollowingIds(new Set((data ?? []).map((x) => x.following_id)));
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, visibleUsers, supabase]);

  const toggleFollow = async (targetUserId: string) => {
    if (!user?.id || !supabase) return;
    const isFollowing = followingIds.has(targetUserId);
    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
      return;
    }
    await supabase.from("follows").insert({
      follower_id: user.id,
      following_id: targetUserId,
    });
    setFollowingIds((prev) => new Set(prev).add(targetUserId));
  };

  const joinSpace = async (space: SearchSpace) => {
    if (!user?.id) {
      router.push(`/login?redirect=${encodeURIComponent(`/invite/${space.code}`)}`);
      return;
    }
    if (!supabase) return;
    await supabase
      .from("space_members")
      .upsert({ space_id: space.id, user_id: user.id }, { onConflict: "space_id,user_id" });
    router.push(`/invite/${space.code}`);
  };

  return (
    <AppShell active="search">
      <div className={shellMainColumn}>
        <AppPageHeader
          title="Search "
          subtitle="Find creators, vibes, and community signals"
          trailing={
            <>
              <FeedsCurrentUserHeader />
              <HeaderAccountMenu />
            </>
          }
        />

        <div className="mx-auto flex w-full max-w-7xl gap-6 px-3 py-4 sm:gap-8 sm:px-6 sm:py-5 md:px-8 md:py-6 xl:gap-10 xl:pr-[22rem]">
          <div className="min-w-0 flex-[1.4]">
            <div className="sticky top-[64px] z-20 mb-4 rounded-2xl border border-white/10 bg-[#10192a]/95 p-3 backdrop-blur">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search users, posts, spaces..."
                  className="w-full rounded-xl border border-white/10 bg-[#0f1727] py-3 pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-5">
              {loading ? (
                <p className="text-sm text-slate-400">Searching…</p>
              ) : hasQuery ? (
                <>
                  {hasQueryResults ? (
                    <>
                      {userResults.length > 0 && (
                        <UsersSection
                          users={userResults}
                          followingIds={followingIds}
                          onToggleFollow={toggleFollow}
                        />
                      )}
                      {postResults.length > 0 && <PostsSection posts={postResults} />}
                      {spaceResults.length > 0 && (
                        <SpacesSection spaces={spaceResults} onJoin={joinSpace} />
                      )}
                    </>
                  ) : (
                    <p className="rounded-xl border border-white/8 bg-white/5 p-4 text-sm text-slate-400">
                      No results found for &quot;{debouncedQuery}&quot;.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <TrendingSection
                    tags={trendingTags.length ? trendingTags : ["community", "design", "tools", "ai", "launch"]}
                    onPickTag={(tag) => setQuery(tag)}
                  />
                  {suggestedUsers.length > 0 && (
                    <UsersSection
                      users={suggestedUsers}
                      followingIds={followingIds}
                      onToggleFollow={toggleFollow}
                    />
                  )}
                  {suggestedSpaces.length > 0 && (
                    <SpacesSection spaces={suggestedSpaces} onJoin={joinSpace} />
                  )}
                </>
              )}
            </div>
          </div>

          <aside className="hidden w-80 min-w-0 shrink-0 self-start xl:fixed xl:right-6 xl:top-24 xl:block">
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">For you</p>
                <p className="text-sm leading-relaxed text-slate-400">
                  Suggestions and activity will appear here.
                </p>
                <div className="space-y-2 pt-1">
                  {(trendingTags.length ? trendingTags : ["welcome", "feeds", "community"])
                    .slice(0, 3)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setQuery(tag)}
                        className="block w-full rounded-xl bg-white/5 px-3 py-2.5 text-left text-xs text-slate-400 ring-1 ring-white/5"
                      >
                        #{tag}
                      </button>
                    ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Trending
                </p>
                {topProducts.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No rankings yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {topProducts.map((item, idx) => (
                      <RankingProductRow
                        key={item.id}
                        product={item}
                        rank={idx + 1}
                        period="Daily"
                        onUpvote={async () => {}}
                        pending={false}
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
                {suggestedSpaces.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No spaces yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {suggestedSpaces.slice(0, 3).map((space) => (
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
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

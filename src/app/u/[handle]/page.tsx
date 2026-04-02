"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { publicProfilePath } from "@/lib/profilePath";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/client";
import { shellProfileColumn } from "@/lib/ui/appShellClasses";
import { AppShell } from "@/components/shell/AppShell";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
import { FeedsPostCard } from "@/features/feeds/FeedsPostCard";
import { FEED_POST_SELECT, feedPostFromDbRow } from "@/features/feeds/feedPostFromDb";
import type { DbFeedPost, FeedPost } from "@/features/feeds/feedPostTypes";

/** Display name from @handle when not the current user */
function titleFromTag(tag: string) {
  const s = tag.replace(/^@/, "");
  return s
    .replace(/[._-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

type FollowingRow = { id: string; username: string; display_name: string | null };
type FollowProfileRow = { id: string; username: string; display_name: string | null };
type ProductRow = {
  id: string;
  name: string;
  tagline: string;
  categories: string[] | null;
  logo_url: string | null;
  upvotes: number | null;
};
type SpaceMembershipRow = { space_id: string; joined_at: string };
type SpaceRow = { id: string; code: string; name: string; icon_url: string | null };

export default function UserProfileByHandlePage() {
  const params = useParams();
  const raw = typeof params.handle === "string" ? params.handle : "";
  const handle = decodeURIComponent(raw);
  const tag = handle.startsWith("@") ? handle : `@${handle}`;
  const usernameNorm = tag.replace(/^@/, "").toLowerCase().trim();
  const { name, tag: myTag, avatarEmoji, avatarUrl, user, ready } = useAuthSnapshot();
  const isSelf = ready && myTag.toLowerCase() === tag.toLowerCase();

  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followers, setFollowers] = useState<FollowProfileRow[]>([]);
  const [followings, setFollowings] = useState<FollowingRow[]>([]);
  const [followsLoading, setFollowsLoading] = useState(false);
  const [openFollowModal, setOpenFollowModal] = useState<null | "followers" | "following">(null);
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);
  const [myPostsLoading, setMyPostsLoading] = useState(false);
  const [launchedProducts, setLaunchedProducts] = useState<ProductRow[]>([]);
  const [launchedProductsLoading, setLaunchedProductsLoading] = useState(false);
  const [joinedSpaces, setJoinedSpaces] = useState<SpaceRow[]>([]);
  const [joinedSpacesLoading, setJoinedSpacesLoading] = useState(false);

  const email = isSelf ? (user?.email ?? null) : null;
  const bio =
    isSelf && typeof user?.user_metadata?.bio === "string"
      ? user.user_metadata.bio
      : "";
  const joined =
    isSelf && user?.created_at
      ? new Date(user.created_at).toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        })
      : "";

  const displayName = isSelf && ready ? name : titleFromTag(tag);
  const viewedUserId = isSelf ? user?.id ?? null : profileUserId;

  useEffect(() => {
    if (!usernameNorm) return;
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) return;
    supabase
      .from("profiles")
      .select("id")
      .ilike("username", usernameNorm)
      .limit(1)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null; error: PostgrestError | null }) =>
        setProfileUserId(data?.id ?? null)
      );
  }, [usernameNorm]);

  useEffect(() => {
    if (!user?.id || !profileUserId || isSelf) return;
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) return;
    supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", profileUserId)
      .maybeSingle()
      .then(({ data }: { data: { follower_id: string } | null; error: PostgrestError | null }) =>
        setIsFollowing(!!data)
      );
  }, [user?.id, profileUserId, isSelf]);

  useEffect(() => {
    if (!viewedUserId) return;
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) return;
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", viewedUserId)
      .then(({ count }: { count: number | null; error: PostgrestError | null }) =>
        setFollowersCount(count ?? 0)
      );
    supabase
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", viewedUserId)
      .then(({ count }: { count: number | null; error: PostgrestError | null }) =>
        setFollowingCount(count ?? 0)
      );
  }, [viewedUserId]);

  useEffect(() => {
    if (!viewedUserId) return;
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) {
      setFollowers([]);
      setFollowings([]);
      setFollowsLoading(false);
      return;
    }
    setFollowsLoading(true);
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", viewedUserId)
      .then(({ data: followingRows }: { data: { following_id: string }[] | null; error: PostgrestError | null }) => {
        if (!followingRows?.length) {
          setFollowings([]);
          return;
        }
        const ids = followingRows.map((r) => r.following_id);
        supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", ids)
          .then(
            ({
              data: profiles,
            }: {
              data: FollowProfileRow[] | null;
              error: PostgrestError | null;
            }) => setFollowings((profiles ?? []) as FollowingRow[])
          );
      });
    supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", viewedUserId)
      .then(({ data: followerRows }: { data: { follower_id: string }[] | null; error: PostgrestError | null }) => {
        if (!followerRows?.length) {
          setFollowers([]);
          setFollowsLoading(false);
          return;
        }
        const ids = followerRows.map((r) => r.follower_id);
        supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", ids)
          .then(
            ({
              data: profiles,
            }: {
              data: FollowProfileRow[] | null;
              error: PostgrestError | null;
            }) => {
              setFollowers(profiles ?? []);
              setFollowsLoading(false);
            }
          );
      });
  }, [viewedUserId]);

  useEffect(() => {
    if (!viewedUserId) {
      queueMicrotask(() => {
        setMyPosts([]);
        setMyPostsLoading(false);
      });
      return;
    }
    queueMicrotask(() => {
      setMyPostsLoading(true);
    });
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) {
      setMyPosts([]);
      setMyPostsLoading(false);
      return;
    }
    supabase
      .from("feed_posts")
      .select(FEED_POST_SELECT)
      .eq("user_id", viewedUserId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }: { data: DbFeedPost[] | null; error: PostgrestError | null }) => {
        setMyPostsLoading(false);
        if (error) {
          setMyPosts([]);
          return;
        }
        setMyPosts((data ?? []).map(feedPostFromDbRow));
      });
  }, [viewedUserId]);

  useEffect(() => {
    if (!viewedUserId) {
      queueMicrotask(() => {
        setLaunchedProducts([]);
        setLaunchedProductsLoading(false);
      });
      return;
    }
    queueMicrotask(() => {
      setLaunchedProductsLoading(true);
    });
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) {
      setLaunchedProducts([]);
      setLaunchedProductsLoading(false);
      return;
    }
    supabase
      .from("product")
      .select("id, name, tagline, categories, logo_url, upvotes")
      .eq("user_id", viewedUserId)
      .order("created_at", { ascending: false })
      .limit(24)
      .then(
        ({
          data,
          error,
        }: {
          data: ProductRow[] | null;
          error: PostgrestError | null;
        }) => {
          setLaunchedProductsLoading(false);
          if (error) {
            setLaunchedProducts([]);
            return;
          }
          setLaunchedProducts(data ?? []);
        }
      );
  }, [viewedUserId]);

  useEffect(() => {
    if (!viewedUserId) {
      queueMicrotask(() => {
        setJoinedSpaces([]);
        setJoinedSpacesLoading(false);
      });
      return;
    }
    queueMicrotask(() => {
      setJoinedSpacesLoading(true);
    });
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) {
      setJoinedSpaces([]);
      setJoinedSpacesLoading(false);
      return;
    }
    supabase
      .from("space_members")
      .select("space_id, joined_at")
      .eq("user_id", viewedUserId)
      .order("joined_at", { ascending: false })
      .then(
        ({
          data: memberships,
          error: membershipsErr,
        }: {
          data: SpaceMembershipRow[] | null;
          error: PostgrestError | null;
        }) => {
          if (membershipsErr || !memberships?.length) {
            setJoinedSpaces([]);
            setJoinedSpacesLoading(false);
            return;
          }
          const ids = memberships.map((m) => m.space_id);
          supabase
            .from("spaces")
            .select("id, code, name, icon_url")
            .in("id", ids)
            .then(
              ({
                data: spaceRows,
                error: spacesErr,
              }: {
                data: SpaceRow[] | null;
                error: PostgrestError | null;
              }) => {
                setJoinedSpacesLoading(false);
                if (spacesErr || !spaceRows?.length) {
                  setJoinedSpaces([]);
                  return;
                }
                const byId = new Map(spaceRows.map((s) => [s.id, s]));
                const ordered = memberships
                  .map((m) => byId.get(m.space_id))
                  .filter((s): s is SpaceRow => !!s);
                setJoinedSpaces(ordered);
              }
            );
        }
      );
  }, [viewedUserId]);

  /** Same items as main feed stream (stories use the story rail, not the post list). */
  const profileFeedPosts = useMemo(
    () => myPosts.filter((p) => p.surface !== "Story"),
    [myPosts]
  );

  const toggleFollow = async () => {
    if (!user?.id || !profileUserId || followLoading) return;
    setFollowLoading(true);
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) {
      setFollowLoading(false);
      return;
    }
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profileUserId);
      setIsFollowing(false);
      setFollowersCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profileUserId });
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
    }
    setFollowLoading(false);
  };

  const xpValue = Math.min(1000, profileFeedPosts.length * 8 + followersCount * 6 + launchedProducts.length * 12);
  const xpPercent = Math.max(8, Math.min(100, Math.round((xpValue / 1000) * 100)));

  return (
    <AppShell active="profile">
      <div className={shellProfileColumn}>
        <div className="mx-auto w-full max-w-7xl px-3 pb-14 pt-4 sm:px-6 md:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220] shadow-[0_20px_70px_rgba(2,6,22,0.45)]">
            <div
              className="h-40 w-full bg-cover bg-center sm:h-52"
              style={{
                backgroundImage:
                  "radial-gradient(120% 100% at 10% 0%, rgba(16,185,129,0.22) 0%, rgba(14,165,233,0.18) 42%, rgba(11,18,32,0.72) 100%), linear-gradient(125deg, #102033 0%, #13263d 40%, #0f2e45 72%, #152645 100%)",
              }}
            />

            <div className="px-4 pb-5 sm:px-6 sm:pb-6">
              <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-[#121d2c] shadow-[0_16px_30px_rgba(4,8,22,0.5)] sm:h-28 sm:w-28">
                    {isSelf && avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : isSelf && avatarEmoji ? (
                      <span className="text-4xl leading-none">{avatarEmoji}</span>
                    ) : (
                      <span className="text-2xl font-bold text-white">
                        {tag.replace(/^@/, "").charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="pb-1">
                    <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      {ready || !isSelf ? displayName : "…"}
                    </h1>
                    <p className="mt-1 text-sm text-sky-300">{tag}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {isSelf ? (bio || "Product architect in the Jeanity ecosystem.") : "On Jeanity"}
                    </p>
                    {email && <p className="mt-1 text-xs text-slate-500">{email}</p>}
                    {joined && <p className="mt-0.5 text-xs text-slate-500">Joined {joined}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:pb-2">
                  {!isSelf && (
                    <button
                      type="button"
                      className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      Share
                    </button>
                  )}
                  {isSelf ? (
                    <Link
                      href="/settings"
                      prefetch={false}
                      className="rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                    >
                      Edit Profile
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={toggleFollow}
                      disabled={followLoading || profileUserId === null}
                      className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                        isFollowing
                          ? "border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                          : "bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 text-slate-950 hover:brightness-110"
                      }`}
                    >
                      {followLoading ? "…" : isFollowing ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-[#0f141f] px-4 py-4">
                  <p className="text-3xl font-bold text-white">{launchedProductsLoading ? "…" : launchedProducts.length}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.26em] text-slate-500">Launches</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0f141f] px-4 py-4">
                  <p className="text-3xl font-bold text-white">{joinedSpacesLoading ? "…" : joinedSpaces.length}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.26em] text-slate-500">Spaces</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenFollowModal("followers")}
                  className="rounded-2xl border border-white/10 bg-[#0f141f] px-4 py-4 text-left transition hover:border-white/20 hover:bg-[#121b2a]"
                >
                  <p className="text-3xl font-bold text-white">{followersCount}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.26em] text-slate-500">Followers</p>
                </button>
                <button
                  type="button"
                  onClick={() => setOpenFollowModal("following")}
                  className="rounded-2xl border border-white/10 bg-[#0f141f] px-4 py-4 text-left transition hover:border-white/20 hover:bg-[#121b2a]"
                >
                  <p className="text-3xl font-bold text-white">{followingCount}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.26em] text-slate-500">Following</p>
                </button>
              </div>
            </div>
          </div>

          <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-semibold text-slate-100">
                  Posted by {isSelf ? "you" : displayName}
                </h2>
              </div>
              {myPostsLoading ? (
                <p className="rounded-2xl border border-white/10 bg-[#0f141f] p-4 text-sm text-slate-400">Loading posts…</p>
              ) : profileFeedPosts.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0f141f] p-4 text-sm text-slate-400">
                  <p>No posts yet.</p>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href="/feeds"
                      prefetch={false}
                      className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 transition hover:bg-sky-500/20"
                    >
                      Discover in ranking
                    </Link>
                    <Link
                      href="/search"
                      prefetch={false}
                      className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20"
                    >
                      Find related spaces
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl space-y-4">
                  {profileFeedPosts.map((post, idx) => (
                    <FeedsPostCard key={post.id} post={post} postIndex={idx + 1} mode="feed" />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <section className="rounded-2xl border border-white/10 bg-[#0f141f] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-100">Launched Products</h2>
                </div>
                {launchedProductsLoading ? (
                  <p className="text-sm text-slate-400">Loading products…</p>
                ) : launchedProducts.length === 0 ? (
                  <p className="text-sm text-slate-400">No launched products yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {launchedProducts.map((product) => (
                      <li key={product.id}>
                        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0d1524] p-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-emerald-500/25 to-sky-500/25 ring-1 ring-white/10">
                            {product.logo_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={product.logo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-white">
                                {product.name.charAt(0).toUpperCase() || "P"}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-100">{product.name}</p>
                            <p className="truncate text-xs text-slate-400">{product.tagline || "No tagline"}</p>
                          </div>
                          <span className="text-xs font-semibold text-slate-300">{product.upvotes ?? 0}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#0f141f] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-100">Spaces Joined</h2>
                  <span className="text-xs text-slate-400">{joinedSpaces.length}</span>
                </div>
                {joinedSpacesLoading ? (
                  <p className="text-sm text-slate-400">Loading spaces…</p>
                ) : joinedSpaces.length === 0 ? (
                  <p className="text-sm text-slate-400">No visible spaces joined.</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2">
                    {joinedSpaces.slice(0, 4).map((space) => (
                      <li key={space.id}>
                        <Link
                          href={`/${space.code}`}
                          prefetch={false}
                          className="flex h-20 flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0d1524] px-2 text-center transition hover:bg-[#132033]"
                        >
                          <span className="mb-1 text-lg">
                            {space.icon_url ? "●" : "•"}
                          </span>
                          <span className="w-full truncate text-xs font-medium text-slate-200">{space.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-[#0f141f] p-4">
                <h2 className="text-base font-semibold text-slate-100">Rank & Reputation</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Top contributors keep growing their visibility through posts, launches, and community activity.
                </p>
                <div className="mt-4 h-2 rounded-full bg-[#1a2a3f]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>LVL {Math.max(1, Math.floor(xpValue / 200))}</span>
                  <span>{xpValue} / 1000 XP</span>
                </div>
              </section>

              {isSelf && followings.length > 0 && (
                <section className="rounded-2xl border border-white/10 bg-[#0f141f] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-100">Following</h2>
                    <span className="text-xs text-slate-400">{followingCount}</span>
                  </div>
                  <ul className="space-y-1">
                    {followings.slice(0, 8).map((p) => (
                      <li key={p.id}>
                        <Link
                          href={publicProfilePath(p.username)}
                          prefetch={false}
                          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 transition hover:bg-[#132033] hover:text-white"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/30 to-sky-500/30 text-xs font-bold text-white">
                            {(p.display_name || p.username).charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{p.display_name || p.username}</span>
                          <span className="text-slate-500">@{p.username.replace(/^@/, "")}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </section>
        </div>
      </div>

      {openFollowModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f141f] shadow-[0_20px_70px_rgba(2,6,22,0.5)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                {openFollowModal === "followers" ? "Followers" : "Following"}
              </h3>
              <button
                type="button"
                onClick={() => setOpenFollowModal(null)}
                className="rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
              >
                Close
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {followsLoading ? (
                <p className="px-2 py-2 text-sm text-slate-400">Loading…</p>
              ) : (openFollowModal === "followers" ? followers : followings).length === 0 ? (
                <p className="px-2 py-2 text-sm text-slate-400">
                  No {openFollowModal === "followers" ? "followers" : "following"} yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {(openFollowModal === "followers" ? followers : followings).map((p) => (
                    <li key={p.id}>
                      <Link
                        href={publicProfilePath(p.username)}
                        prefetch={false}
                        onClick={() => setOpenFollowModal(null)}
                        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 transition hover:bg-[#132033] hover:text-white"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/30 to-sky-500/30 text-xs font-bold text-white">
                          {(p.display_name || p.username).charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{p.display_name || p.username}</span>
                        <span className="text-slate-500">@{p.username.replace(/^@/, "")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}

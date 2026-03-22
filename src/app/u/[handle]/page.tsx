"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { publicProfilePath } from "@/lib/profilePath";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { shellProfileColumn } from "@/lib/ui/appShellClasses";
import { AppShell } from "@/components/shell/AppShell";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
import { FeedsPostCard } from "@/features/feeds/FeedsPostCard";
import { FEED_POST_SELECT, feedPostFromDbRow } from "@/features/feeds/feedPostFromDb";
import type { DbFeedPost, FeedPost } from "@/features/feeds/feedsPostTypes";

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
  const [followings, setFollowings] = useState<FollowingRow[]>([]);
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);
  const [myPostsLoading, setMyPostsLoading] = useState(false);

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
    const supabase = getSupabaseBrowserClient();
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
    const supabase = getSupabaseBrowserClient();
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
    const supabase = getSupabaseBrowserClient();
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
    if (!isSelf || !user?.id) return;
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .then(({ data: followRows }: { data: { following_id: string }[] | null; error: PostgrestError | null }) => {
        if (!followRows?.length) {
          setFollowings([]);
          return;
        }
        const ids = followRows.map((r) => r.following_id);
        supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", ids)
          .then(
            ({
              data: profiles,
            }: {
              data: FollowingRow[] | null;
              error: PostgrestError | null;
            }) => setFollowings((profiles ?? []) as FollowingRow[])
          );
      });
  }, [isSelf, user?.id]);

  useEffect(() => {
    if (!isSelf || !user?.id) {
      setMyPosts([]);
      setMyPostsLoading(false);
      return;
    }
    setMyPostsLoading(true);
    const supabase = getSupabaseBrowserClient();
    supabase
      .from("feed_posts")
      .select(FEED_POST_SELECT)
      .eq("user_id", user.id)
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
  }, [isSelf, user?.id]);

  /** Same items as main feed stream (stories use the story rail, not the post list). */
  const profileFeedPosts = useMemo(
    () => myPosts.filter((p) => p.surface !== "Story"),
    [myPosts]
  );

  const toggleFollow = async () => {
    if (!user?.id || !profileUserId || followLoading) return;
    setFollowLoading(true);
    const supabase = getSupabaseBrowserClient();
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

  return (
    <AppShell active="profile">
      <div className={shellProfileColumn}>
        <div
          className="h-32 w-full sm:h-40 md:h-44 lg:h-52"
          style={{
            background:
              "linear-gradient(125deg, #7c3aed 0%, #db2777 40%, #f97316 70%, #22c55e 100%)",
          }}
        />
        {/* Same flex + rail spacer as /feeds so post cards match width (incl. xl). */}
        <div className="relative mx-auto flex w-full max-w-6xl gap-6 px-3 py-4 sm:gap-8 sm:px-6 sm:py-5 md:px-8 md:py-6 xl:gap-10">
          <div className="min-w-0 flex-1">
          <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-[#0a0e1a] bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-500 text-4xl shadow-xl ring-2 ring-emerald-400/30 sm:h-32 sm:w-32">
              {isSelf && avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : isSelf && avatarEmoji ? (
                <span className="text-4xl leading-none">{avatarEmoji}</span>
              ) : (
                <span className="text-2xl font-bold text-slate-950">
                  {tag.replace(/^@/, "").charAt(0).toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:mb-2 sm:pb-1">
              {isSelf ? (
                <Link
                  href="/settings"
                  prefetch={false}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                  Edit profile
                </Link>
              ) : (
                <Link
                  href="/feeds"
                  prefetch={false}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                  View feeds
                </Link>
              )}
              {!isSelf && (
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={followLoading || profileUserId === null}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    isFollowing
                      ? "border border-white/20 bg-white/10 text-white"
                      : "bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 text-slate-950"
                  }`}
                >
                  {followLoading ? "…" : isFollowing ? "Followed" : "Follow"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {ready || !isSelf ? displayName : "…"}
            </h1>
            <p className="text-sky-400/90">{tag}</p>
            {email && <p className="text-sm text-slate-500">{email}</p>}
            {joined && <p className="text-xs text-slate-600">Joined {joined}</p>}
            {!isSelf && !joined && (
              <p className="text-xs text-slate-600">On Jeanity</p>
            )}
          </div>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400">
            {isSelf
              ? bio || "No bio yet. Add one in Settings."
              : "No bio yet."}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border border-white/8 bg-[#0f1419] p-4 ring-1 ring-white/[0.06] sm:max-w-md">
            <div className="text-center">
              <p className="text-lg font-bold text-white">
                {isSelf ? (myPostsLoading ? "…" : profileFeedPosts.length) : "—"}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Posts
              </p>
            </div>
            <div className="border-x border-white/10 text-center">
              <p className="text-lg font-bold text-white">{followersCount}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Followers
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{followingCount}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Following
              </p>
            </div>
          </div>

          {isSelf && followings.length > 0 && (
            <section className="mt-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Following ({followings.length})
              </p>
              <ul className="space-y-1 rounded-xl border border-white/8 bg-[#0f1419] p-3 ring-1 ring-white/[0.06]">
                {followings.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={publicProfilePath(p.username)}
                      prefetch={false}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-white/5 hover:text-white"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/40 to-emerald-600/40 text-xs font-bold text-white ring-1 ring-white/10">
                        {(p.display_name || p.username).charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {p.display_name || p.username}
                      </span>
                      <span className="text-slate-500">@{p.username.replace(/^@/, "")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {isSelf && (
            <section className="mt-8 space-y-4 pb-16">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Your posts
              </h2>
              {myPostsLoading ? (
                <p className="text-sm text-slate-500">Loading posts…</p>
              ) : profileFeedPosts.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No posts yet.{" "}
                  <Link href="/feeds" prefetch={false} className="text-sky-400 hover:underline">
                    Create one from Feeds
                  </Link>
                  .
                </p>
              ) : (
                <div className="space-y-5 lg:space-y-6">
                  {profileFeedPosts.map((post, idx) => (
                    <FeedsPostCard key={post.id} post={post} postIndex={idx + 1} mode="feed" />
                  ))}
                </div>
              )}
            </section>
          )}
          </div>

          <aside
            className="hidden w-72 min-w-0 shrink-0 self-start xl:block"
            aria-hidden
          />
        </div>
      </div>

    </AppShell>
  );
}

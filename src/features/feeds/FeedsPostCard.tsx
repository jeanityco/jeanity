"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FeedPost } from "@/features/feeds/feedPostTypes";
import { useFeedsPosts } from "@/features/feeds/FeedsPostsContext";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
import { getSupabaseBrowserClientOrNull } from "@/lib/supabase/client";
import { publicProfilePath } from "@/lib/profilePath";
import { trackEngagementEvent } from "@/lib/analytics/engagementEvents";

function sameUser(postTag: string, myTag: string | null): boolean {
  if (!myTag) return false;
  const a = (postTag || "").replace(/^@/, "").toLowerCase();
  const b = (myTag || "").replace(/^@/, "").toLowerCase();
  return a === b;
}

type CommentsControlProps = {
  count: number;
  postId: string;
  mode: "feed" | "detail";
};

function CommentsControl({ count, postId, mode }: CommentsControlProps) {
  const btnClass = `inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 backdrop-blur-sm ${
    mode === "feed" ? "transition hover:bg-white/20" : ""
  }`;

  const icon = (
    <svg
      className="h-5 w-5 text-slate-200"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );

  const button =
    mode === "feed" ? (
      <Link href={`/feeds/post/${postId}`} prefetch={false} className={btnClass} aria-label="View comments">
        {icon}
        <span className="text-xs font-semibold text-white">{count}</span>
      </Link>
    ) : (
      <a href="#feed-post-comments" className={btnClass} aria-label="Comments below">
        {icon}
        <span className="text-xs font-semibold text-white">{count}</span>
      </a>
    );

  return <div>{button}</div>;
}

type PostLikeControlProps = {
  postId: string;
  baseCount: number;
  variant: "overlay" | "inline";
};

function PostLikeControl({ postId, baseCount, variant }: PostLikeControlProps) {
  const { user } = useAuthSnapshot();
  const { bumpPostLikeCount } = useFeedsPosts();
  const [myVote, setMyVote] = useState<-1 | 0 | 1>(0);
  const [likeBusy, setLikeBusy] = useState(false);

  const syncMyVote = async () => {
    if (!user?.id) {
      setMyVote(0);
      return;
    }
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) {
      setMyVote(0);
      return;
    }
    const { data } = await supabase
      .from("feed_post_votes")
      .select("vote")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    setMyVote(((data as { vote: -1 | 1 } | null)?.vote ?? 0) as -1 | 0 | 1);
  };

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (alive) setMyVote(0);
    });
    if (!user?.id) {
      return () => {
        alive = false;
      };
    }
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) {
      return () => {
        alive = false;
      };
    }
    void supabase
      .from("feed_post_votes")
      .select("vote")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { vote: -1 | 1 } | null }) => {
        if (alive) setMyVote(data?.vote ?? 0);
      });
    return () => {
      alive = false;
    };
  }, [user?.id, postId]);

  const controlClass =
    variant === "overlay"
      ? "inline-flex h-11 items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-1.5 backdrop-blur-sm"
      : "inline-flex h-11 items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-1.5 backdrop-blur-sm";

  const setVote = async (nextVote: -1 | 0 | 1) => {
    if (!user?.id || likeBusy || myVote === nextVote) return;
    setLikeBusy(true);
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) {
      setLikeBusy(false);
      return;
    }

    const delta = nextVote - myVote;
    bumpPostLikeCount(postId, delta);
    setMyVote(nextVote);

    if (nextVote === 0) {
      const { error } = await supabase
        .from("feed_post_votes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      if (error) {
        bumpPostLikeCount(postId, -delta);
        setMyVote(myVote);
        if (process.env.NODE_ENV === "development") {
          console.warn("[feeds] clear vote failed:", error.message);
        }
      } else {
        void syncMyVote();
      }
      setLikeBusy(false);
      return;
    }

    const { error } = await supabase.from("feed_post_votes").upsert(
      { post_id: postId, user_id: user.id, vote: nextVote },
      { onConflict: "post_id,user_id" }
    );
    if (error) {
      bumpPostLikeCount(postId, -delta);
      setMyVote(myVote);
      if (process.env.NODE_ENV === "development") {
        console.warn("[feeds] vote upsert failed:", error.message);
      }
    } else {
      void syncMyVote();
    }
    setLikeBusy(false);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={controlClass}>
        <button
          type="button"
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            myVote === 1 ? "bg-white/20 text-white" : "text-slate-200 hover:bg-white/15"
          }`}
          disabled={!user?.id || likeBusy}
          aria-pressed={myVote === 1}
          aria-label={myVote === 1 ? "Remove upvote" : "Upvote"}
          onClick={() => void setVote(myVote === 1 ? 0 : 1)}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 14l5-5 5 5" />
          </svg>
        </button>
        <span className="min-w-[2ch] text-center text-xs font-semibold text-white">{baseCount}</span>
        <button
          type="button"
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            myVote === -1 ? "bg-white/20 text-white" : "text-slate-200 hover:bg-white/15"
          }`}
          disabled={!user?.id || likeBusy}
          aria-pressed={myVote === -1}
          aria-label={myVote === -1 ? "Remove downvote" : "Downvote"}
          onClick={() => void setVote(myVote === -1 ? 0 : -1)}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 10l5 5 5-5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export type FeedsPostCardProps = {
  post: FeedPost;
  postIndex: number;
  mode?: "feed" | "detail";
};

/**
 * Same markup as the feed list so the post detail page matches the feed pixel-for-pixel
 * (full-bleed image block: `w-full`, no horizontal padding inside the media row).
 */
export function FeedsPostCard({ post, postIndex, mode = "feed" }: FeedsPostCardProps) {
  const { tag: myTag, user } = useAuthSnapshot();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const isMe = sameUser(post.authorTag, myTag);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || isMe) {
      queueMicrotask(() => {
        if (!cancelled) setIsFollowing(false);
      });
      return;
    }
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) return;
    void supabase
      .from("profiles")
      .select("id")
      .ilike("username", post.authorTag.replace(/^@/, ""))
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => {
        if (!data?.id || cancelled) return;
        return supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", data.id)
          .maybeSingle()
          .then(({ data: follow }: { data: { follower_id: string } | null }) => {
            if (!cancelled) setIsFollowing(!!follow);
          });
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, post.authorTag, isMe]);

  const toggleFollow = async () => {
    if (!user?.id || followBusy || isMe) return;
    const supabase = getSupabaseBrowserClientOrNull();
    if (!supabase) return;
    setFollowBusy(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", post.authorTag.replace(/^@/, ""))
      .maybeSingle();
    const profileId = (profile as { id?: string } | null)?.id;
    if (!profileId) {
      setFollowBusy(false);
      return;
    }
    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profileId);
      setIsFollowing(false);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: profileId });
      setIsFollowing(true);
      await trackEngagementEvent({
        stage: "follow",
        surface: "feed",
        action: "follow_creator_from_post",
        entityType: "user",
        entityId: profileId,
      });
    }
    setFollowBusy(false);
  };

  if (post.surface === "Launch" && post.launchName) {
    return (
      <article className="flex items-center gap-4 rounded-2xl border border-white/8 bg-[#0f1419] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.06] sm:p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10 sm:h-16 sm:w-16">
          {post.launchLogoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={post.launchLogoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-slate-500">Logo</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-white sm:text-base">
            <span className="text-slate-500">{postIndex}.</span> {post.launchName}
          </h3>
          <p className="mt-1 text-sm text-slate-400">{post.caption.trim() || "\u00A0"}</p>
          {post.launchCategories && post.launchCategories.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              {post.launchCategories.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rotate-45 bg-slate-500" aria-hidden />
                  {c}
                </span>
              ))}
            </p>
          )}
          <p className="mt-2 text-[10px] text-slate-600">
            Launched by{" "}
            <Link
              href={publicProfilePath(post.authorTag)}
              prefetch={false}
              className="font-medium text-sky-400/90 hover:underline"
            >
              {post.authorName}
            </Link>{" "}
            ·{" "}
            <Link href={publicProfilePath(post.authorTag)} prefetch={false} className="hover:underline">
              {post.authorTag}
            </Link>
          </p>
        </div>
        <div className="flex min-w-[3rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] px-2.5 py-2.5 ring-1 ring-white/8">
          <svg
            className="block h-[11px] w-[13px] shrink-0 text-emerald-400"
            viewBox="0 0 13 11"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6.5 1.5L12 9.5H1L6.5 1.5z" />
          </svg>
          <span className="text-[15px] font-semibold leading-none tabular-nums tracking-tight text-slate-100">
            {post.likes}
          </span>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-white/8 bg-[#0f1419] shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.06]">
      <div className="flex items-start gap-3 p-4 pb-3 sm:p-5">
        <Link
          href={publicProfilePath(post.authorTag)}
          prefetch={false}
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 ring-0 transition hover:border-white/20 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:h-11 sm:w-11"
          aria-label={`${post.authorName} profile`}
        >
          {post.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={post.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-500 text-base sm:text-lg">
              {post.avatarEmoji || (
                <span className="text-sm font-bold text-slate-950">
                  {post.authorName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <div className="flex min-w-0 max-w-full flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <Link
                href={publicProfilePath(post.authorTag)}
                prefetch={false}
                className="shrink-0 font-semibold text-white no-underline hover:text-white hover:no-underline sm:text-base"
              >
                {post.authorName}
              </Link>
              <Link
                href={publicProfilePath(post.authorTag)}
                prefetch={false}
                className="min-w-0 truncate text-[13px] font-normal text-slate-500 no-underline hover:text-slate-500 hover:no-underline sm:text-sm"
              >
                {post.authorTag}
              </Link>
            </div>
            {post.surface && post.surface !== "Post" && (
              <span className="rounded-full bg-[#1e3a5f]/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200 ring-1 ring-sky-500/25">
                {post.surface}
              </span>
            )}
            {!isMe && (
              <button
                type="button"
                onClick={() => void toggleFollow()}
                disabled={followBusy}
                className="shrink-0 rounded-lg bg-[#1e3a5f] px-3 py-1 text-xs font-semibold text-white ring-1 ring-sky-500/30 disabled:opacity-60 sm:px-4 sm:py-1.5 sm:text-sm"
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{post.timeLabel}</p>
        </div>
        <button
          type="button"
          aria-label="Share"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 sm:h-11 sm:w-11"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186z"
            />
          </svg>
        </button>
      </div>
      <p className="break-words px-4 pb-3 text-[15px] leading-relaxed text-slate-200 sm:px-5 sm:text-sm">
        {post.caption.trim() || "\u00A0"}
      </p>
      {/* Media: edge-to-edge inside the card (matches feed) */}
      <div
        className={`relative w-full min-w-0 ${
          post.imageUrl ? "aspect-[4/3] bg-slate-900 sm:aspect-video" : "bg-transparent"
        }`}
      >
        {post.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.imageUrl} alt="" className="h-full w-full min-h-0 min-w-0 object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-start gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-16">
              <div className="flex items-end gap-3">
                <PostLikeControl postId={post.id} baseCount={post.likes} variant="overlay" />
                <CommentsControl count={post.comments} postId={post.id} mode={mode} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex w-full items-center justify-between gap-3 px-4 py-2 sm:px-5 sm:py-2.5">
            <div className="flex items-end gap-3">
              <PostLikeControl postId={post.id} baseCount={post.likes} variant="inline" />
              <CommentsControl count={post.comments} postId={post.id} mode={mode} />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

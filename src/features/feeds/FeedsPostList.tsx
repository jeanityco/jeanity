"use client";

import { useMemo } from "react";
import { FeedsPostCard } from "@/features/feeds/FeedsPostCard";
import { useFeedsPosts } from "@/features/feeds/FeedsPostsContext";

/** Feed stream is `feed_posts` only; products live in `product` and appear under Ranking. */
export function FeedsPostList() {
  const { posts, feedRankingActive, feedHasMore, feedLoadingMore, loadMorePosts } = useFeedsPosts();

  const feedPosts = useMemo(
    () => posts.filter((p) => p.surface !== "Story"),
    [posts]
  );

  return (
    <div className="space-y-5 lg:space-y-6">
      {feedPosts.map((post, idx) => (
        <FeedsPostCard key={post.id} post={post} postIndex={idx + 1} mode="feed" />
      ))}
      {feedRankingActive && feedHasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={feedLoadingMore}
            onClick={() => void loadMorePosts()}
            className="rounded-full border border-white/15 bg-white/[0.06] px-6 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {feedLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

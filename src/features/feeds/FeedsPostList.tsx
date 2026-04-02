"use client";

import { useMemo } from "react";
import { FeedsPostCard } from "@/features/feeds/FeedsPostCard";
import { useFeedsPosts } from "@/features/feeds/FeedsPostsContext";
import { FeedsTrendingPreview } from "@/features/feeds/FeedsTrendingPreview";
import { FeedsSpacesPreview } from "@/features/feeds/FeedsSpacesPreview";
import { FEED_LAYOUT } from "@/features/feeds/feedUi";

const DEMO_SHOW_ALL_BLOCKS_NOW = true;

/** Feed stream is `feed_posts` only; products live in `product` and appear under Ranking. */
export function FeedsPostList() {
  const { posts, feedRankingActive, feedHasMore, feedLoadingMore, loadMorePosts } = useFeedsPosts();

  const feedPosts = useMemo(
    () => posts.filter((p) => p.surface !== "Story"),
    [posts]
  );

  return (
    <div className={`${FEED_LAYOUT.postGapClass}`}>
      {DEMO_SHOW_ALL_BLOCKS_NOW && (
        <>
          <div className={FEED_LAYOUT.blockGapClass}>
            <FeedsTrendingPreview limit={5} />
          </div>
          <div className={FEED_LAYOUT.blockGapClass}>
            <FeedsSpacesPreview />
          </div>
        </>
      )}
      {feedPosts.map((post, idx) => {
        const showTrending =
          !DEMO_SHOW_ALL_BLOCKS_NOW && idx > 0 && idx % 5 === 0;
        const showSpaces =
          !DEMO_SHOW_ALL_BLOCKS_NOW && idx > 0 && idx % 8 === 0;
        return (
          <div key={post.id}>
            {(showTrending || showSpaces) && <div className={FEED_LAYOUT.blockGapClass} />}
            {showTrending && <FeedsTrendingPreview limit={5} />}
            {showSpaces && <FeedsSpacesPreview />}
            {(showTrending || showSpaces) && <div className={FEED_LAYOUT.blockGapClass} />}
            <FeedsPostCard post={post} postIndex={idx + 1} mode="feed" />
          </div>
        );
      })}
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

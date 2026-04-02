"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFeedsPosts } from "@/features/feeds/FeedsPostsContext";
import { PREVIEW_TEXT } from "@/features/feeds/feedUi";
import { RankingProductRow, type RankingPeriod } from "@/features/feeds/FeedsRankingList";

type Props = {
  limit?: number;
};

export function FeedsTrendingPreview({ limit = 5 }: Props) {
  const { products, upvoteProduct } = useFeedsPosts();
  const [upvotingIds, setUpvotingIds] = useState<Set<string>>(new Set());
  const period: RankingPeriod = "Daily";

  const ranked = useMemo(
    () =>
      [...products]
        .sort((a, b) => b.upvotes - a.upvotes)
        .slice(0, limit),
    [products, limit]
  );

  if (ranked.length === 0) return null;

  const handleUpvote = (productId: string) => {
    if (upvotingIds.has(productId)) return;
    setUpvotingIds((prev) => new Set(prev).add(productId));
    void upvoteProduct(productId).finally(() => {
      setUpvotingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    });
  };

  return (
    <section className="feed-preview-surface p-3.5">
      <h3 className={`${PREVIEW_TEXT.title} mb-2`}>Trending 🔥</h3>
      <ul className="space-y-2">
        {ranked.map((item, index) => (
          <RankingProductRow
            key={item.id}
            product={item}
            rank={index + 1}
            period={period}
            onUpvote={handleUpvote}
            pending={upvotingIds.has(item.id)}
          />
        ))}
      </ul>
      <Link
        href="/feeds"
        prefetch={false}
        className="mt-2 inline-flex text-[12px] font-medium text-sky-300 transition hover:text-sky-200"
      >
        See full ranking
      </Link>
    </section>
  );
}


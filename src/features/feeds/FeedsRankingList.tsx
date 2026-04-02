"use client";

import { useEffect, useMemo, useState } from "react";
import { useFeedsPosts } from "@/features/feeds/FeedsPostsContext";
import { usePostComposer } from "@/features/feeds/PostComposerModal";
import type { FeedProduct } from "@/features/feeds/feedPostTypes";
import { shellLaunchGradientClass } from "@/lib/ui/appShellClasses";
import { trackEngagementEvent } from "@/lib/analytics/engagementEvents";

export const RANKING_PERIODS = ["Daily", "Weekly", "Monthly"] as const;
export type RankingPeriod = (typeof RANKING_PERIODS)[number];

export function RankingProductRow({
  product,
  rank,
  period,
  onUpvote,
  pending,
  showUpvoteIcon = true,
  upvoteInteractive = true,
  compact = false,
}: {
  product: FeedProduct;
  rank: number;
  period: RankingPeriod;
  onUpvote: (productId: string) => void;
  pending: boolean;
  showUpvoteIcon?: boolean;
  upvoteInteractive?: boolean;
  compact?: boolean;
}) {
  const tagline = product.tagline?.trim() || "\u00A0";
  const categories = product.categories ?? [];

  return (
    <li>
      <div
        className={`flex items-center rounded-2xl border border-white/[0.08] bg-[#161b22] ring-1 ring-white/[0.06] ${
          compact ? "gap-3 p-3" : "gap-4 p-4"
        }`}
      >
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-600/90 to-slate-800/90 ring-1 ring-white/10 ${
            compact ? "h-11 w-11" : "h-14 w-14"
          }`}
        >
          {product.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={product.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <svg
              className={`${compact ? "h-6 w-6" : "h-8 w-8"} text-white/85`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.25}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13l4 4m0-4l-4 4"
              />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="sr-only">Ranking window {period}</span>
          <h3 className={`${compact ? "text-[13px]" : "text-[15px] sm:text-base"} font-bold text-white`}>
            <span className="font-semibold text-slate-500">{rank}.</span> {product.name}
          </h3>
          <p className={`${compact ? "mt-0.5 text-[11px]" : "mt-1 text-sm"} leading-snug text-slate-400 line-clamp-1`}>{tagline}</p>
          {categories.length > 0 && (
            <p
              className={`${
                compact ? "mt-1 text-[11px]" : "mt-2 text-xs"
              } flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-500`}
            >
              {categories.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500" aria-hidden>
                    ◆
                  </span>
                  {c}
                </span>
              ))}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (!upvoteInteractive) return;
            onUpvote(product.id);
          }}
          disabled={pending || !upvoteInteractive}
          className={`flex min-w-[3rem] shrink-0 flex-col items-center justify-center ${
            compact ? "gap-1 rounded-xl px-2 py-1.5" : "gap-1.5 rounded-2xl px-2.5 py-2.5"
          } bg-white/[0.07] ring-1 ring-white/[0.08] ${
            upvoteInteractive
              ? "transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
              : "cursor-default"
          }`}
          aria-label="Upvote product"
          title="Upvote"
        >
          {showUpvoteIcon && (
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
          )}
          <span className={`${compact ? "text-base" : "text-[15px]"} font-semibold leading-none tabular-nums tracking-tight text-slate-100`}>
            {product.upvotes}
          </span>
        </button>
      </div>
    </li>
  );
}

type FeedsRankingListProps = {
  period?: RankingPeriod;
};

export function FeedsRankingList({ period = "Daily" }: FeedsRankingListProps) {
  const { openLaunch } = usePostComposer();
  const { products, upvoteProduct } = useFeedsPosts();
  const [upvotingIds, setUpvotingIds] = useState<Set<string>>(new Set());
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const ranked = useMemo(() => {
    const oneDay = 24 * 60 * 60 * 1000;
    const windowMs =
      period === "Daily" ? oneDay : period === "Weekly" ? 7 * oneDay : 30 * oneDay;
    const tau = period === "Daily" ? 18 : period === "Weekly" ? 72 : 168;
    const minTs = nowMs - windowMs * 2;

    return products
      .filter((p) => {
        const ts = new Date(p.createdAt).getTime();
        return Number.isFinite(ts) && ts >= minTs;
      })
      .sort((a, b) => {
        const scoreA = (() => {
          const ageHours = Math.max(1, (nowMs - new Date(a.createdAt).getTime()) / 3_600_000);
          const raw = 1.0 * a.upvotes + 1.8 * a.comments;
          return raw / Math.exp(ageHours / tau);
        })();
        const scoreB = (() => {
          const ageHours = Math.max(1, (nowMs - new Date(b.createdAt).getTime()) / 3_600_000);
          const raw = 1.0 * b.upvotes + 1.8 * b.comments;
          return raw / Math.exp(ageHours / tau);
        })();
        const byScore = scoreB - scoreA;
        if (byScore !== 0) return byScore;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [products, period, nowMs]);

  const periodLabel = period.toLowerCase();
  const handleUpvote = (productId: string) => {
    if (upvotingIds.has(productId)) return;
    setUpvotingIds((prev) => new Set(prev).add(productId));
    void upvoteProduct(productId).then(async () => {
      await trackEngagementEvent({
        stage: "react",
        surface: "ranking",
        action: "upvote_launch",
        entityType: "product",
        entityId: productId,
      });
    }).finally(() => {
      setUpvotingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    });
  };

  return (
    <div className="space-y-3">
      <div className="mb-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 ring-1 ring-white/5 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white">Ranking</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Best launches in the {periodLabel} window, ranked by weighted activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => openLaunch()}
              className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:brightness-110 sm:px-6 ${shellLaunchGradientClass}`}
            >
              Launch
            </button>
          </div>
        </div>
      </div>
      {ranked.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#161b22]/80 px-4 py-10 text-center ring-1 ring-white/[0.05]">
          <p className="text-sm text-slate-400">No products in the {periodLabel} window yet.</p>
          <p className="mt-1 text-xs text-slate-600">
            Try switching to another period, or use Launch to add a new product.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {ranked.map((product, i) => (
            <RankingProductRow
              key={product.id}
              product={product}
              rank={i + 1}
              period={period}
              onUpvote={handleUpvote}
              pending={upvotingIds.has(product.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

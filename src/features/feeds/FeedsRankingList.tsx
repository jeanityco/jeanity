"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useFeedsPosts } from "@/features/feeds/FeedsPostsContext";
import { usePostComposer } from "@/features/feeds/PostComposerModal";
import type { FeedProduct } from "@/features/feeds/feedsPostTypes";
import { shellLaunchGradientClass } from "@/lib/ui/appShellClasses";

function RankingProductRow({ product, rank }: { product: FeedProduct; rank: number }) {
  const tagline = product.tagline?.trim() || "\u00A0";
  const categories = product.categories ?? [];

  return (
    <li>
      <Link
        href={`/feeds/product/${product.id}`}
        prefetch={false}
        className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#161b22] p-4 ring-1 ring-white/[0.06] transition hover:border-emerald-500/25 hover:bg-[#1a2029]"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-600/90 to-slate-800/90 ring-1 ring-white/10">
          {product.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={product.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <svg
              className="h-8 w-8 text-white/85"
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
          <h3 className="text-[15px] font-bold text-white sm:text-base">
            <span className="font-semibold text-slate-500">{rank}.</span> {product.name}
          </h3>
          <p className="mt-1 text-sm leading-snug text-slate-400">{tagline}</p>
          {categories.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
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
        <div
          className="flex min-w-[3rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/[0.07] px-2.5 py-2.5 ring-1 ring-white/[0.08]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
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
            {product.upvotes}
          </span>
        </div>
      </Link>
    </li>
  );
}

export function FeedsRankingList() {
  const { openLaunch } = usePostComposer();
  const { products } = useFeedsPosts();

  const ranked = useMemo(() => {
    return [...products].sort((a, b) => b.upvotes - a.upvotes || (b.id > a.id ? 1 : -1));
  }, [products]);

  return (
    <div className="space-y-3">
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 ring-1 ring-white/5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white">Ranking</h2>
          <p className="mt-0.5 text-sm text-slate-500">Top tools and agents on Jeanity this week</p>
        </div>
        <button
          type="button"
          onClick={() => openLaunch()}
          className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:brightness-110 sm:px-6 ${shellLaunchGradientClass}`}
        >
          Launch
        </button>
      </div>
      {ranked.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#161b22]/80 px-4 py-10 text-center ring-1 ring-white/[0.05]">
          <p className="text-sm text-slate-400">Nothing ranked yet.</p>
          <p className="mt-1 text-xs text-slate-600">Use Launch in the composer to add a product — it will show here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {ranked.map((product, i) => (
            <RankingProductRow key={product.id} product={product} rank={i + 1} />
          ))}
        </ul>
      )}
    </div>
  );
}

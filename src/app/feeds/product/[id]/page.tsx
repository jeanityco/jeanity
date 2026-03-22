"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FeedsCurrentUserHeader } from "@/features/feeds/FeedsCurrentUser";
import { FeedsDiscordComment } from "@/features/feeds/FeedsDiscordComment";
import { FeedsPostCard } from "@/features/feeds/FeedsPostCard";
import { feedProductToLaunchFeedPost } from "@/features/feeds/productFromDb";
import { useFeedsPosts } from "@/features/feeds/FeedsPostsContext";
import { AppShell } from "@/components/shell/AppShell";
import { HeaderAccountMenu } from "@/components/shell/HeaderAccountMenu";
import { useAuthSnapshot } from "@/lib/auth/AuthProvider";
import { shellEmptyColumn, shellMainColumn } from "@/lib/ui/appShellClasses";

export default function ProductCommentsPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { tag, user } = useAuthSnapshot();
  const {
    products,
    getProduct,
    getProductComments,
    loadCommentsForProduct,
    addProductComment,
  } = useFeedsPosts();
  const product = id ? getProduct(id) : undefined;
  const comments = id ? getProductComments(id) : [];

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setCommentsLoading(false);
      return;
    }
    setCommentsLoading(true);
    void loadCommentsForProduct(id).finally(() => setCommentsLoading(false));
  }, [id, loadCommentsForProduct]);

  const rank = useMemo(() => {
    if (!product) return 1;
    const ranked = [...products].sort((a, b) => b.upvotes - a.upvotes || (b.id > a.id ? 1 : -1));
    const idx = ranked.findIndex((p) => p.id === product.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [product, products]);

  const displayPost = useMemo(() => {
    if (!product) return undefined;
    const base = feedProductToLaunchFeedPost(product);
    return { ...base, comments: Math.max(base.comments, comments.length) };
  }, [product, comments.length]);

  const submitComment = useCallback(async () => {
    if (!id || !draft.trim() || sending) return;
    setSending(true);
    try {
      await addProductComment(id, draft);
      setDraft("");
    } finally {
      setSending(false);
    }
  }, [id, draft, sending, addProductComment]);

  if (!product || !displayPost) {
    return (
      <AppShell active="feeds">
        <div className={shellEmptyColumn}>
          <div className="max-w-lg space-y-4">
            <p className="text-slate-400">Product not found.</p>
            <Link href="/feeds" prefetch={false} className="inline-block text-sky-400 hover:underline">
              Back to Feeds
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="feeds">
      <div className={shellMainColumn}>
        <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0a0e1a]/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] backdrop-blur-xl sm:px-6 md:px-8 md:py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3 lg:gap-4">
              <Link
                href="/feeds"
                prefetch={false}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white active:scale-[0.98]"
                aria-label="Back to Feeds"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold tracking-tight text-white sm:text-xl md:text-2xl">
                  Comments
                </h1>
                <p className="hidden truncate text-xs text-slate-500 sm:block md:text-sm">
                  {product.name}
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 md:flex-initial md:gap-4">
              <FeedsCurrentUserHeader />
              <HeaderAccountMenu />
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-3 py-5 sm:gap-8 sm:px-6 sm:py-6 md:px-8 md:py-8 xl:gap-10">
          <div className="flex min-w-0 flex-1 flex-col gap-6 lg:gap-8">
            <FeedsPostCard post={displayPost} postIndex={rank} mode="detail" />

            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="flex flex-col gap-0 rounded-2xl border border-white/[0.08] bg-[#0c0f14]/90 p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.04] backdrop-blur-md sm:p-3">
                <label htmlFor="product-comment-input" className="sr-only">
                  Write a comment
                </label>
                <textarea
                  id="product-comment-input"
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submitComment();
                    }
                  }}
                  placeholder="Send a message…"
                  disabled={sending}
                  className="input-focus-quiet scrollbar-hide max-h-[min(40vh,16rem)] min-h-[3.5rem] w-full resize-none overflow-y-auto border-0 bg-transparent py-0.5 pb-0 text-[15px] leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-0 disabled:opacity-50 sm:min-h-[4rem]"
                />
                <div className="mt-0.5 flex justify-end sm:mt-1">
                  <button
                    type="button"
                    onClick={() => void submitComment()}
                    disabled={sending || !draft.trim()}
                    className="inline-flex min-h-10 min-w-[5.25rem] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-sky-600 px-4 text-sm font-semibold text-slate-950 shadow-[0_4px_20px_rgba(16,185,129,0.25)] transition hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none sm:min-w-[5.5rem] sm:px-5"
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>

              <section
                id="feed-product-comments"
                aria-label="Comments"
                className="scroll-mt-28"
              >
                <div className="rounded-xl border border-white/[0.08] bg-[#0b0e14]/90 px-2 py-1 sm:px-3">
                  {commentsLoading ? (
                    <p className="py-8 text-center text-sm text-slate-500">Loading messages…</p>
                  ) : comments.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">No messages yet.</p>
                  ) : (
                    <ul className="divide-y divide-white/[0.06]">
                      {comments.map((c) => (
                        <FeedsDiscordComment
                          key={c.id}
                          comment={c}
                          viewerTag={tag}
                          viewerUserId={user?.id ?? null}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          </div>

          <aside className="hidden w-72 shrink-0 xl:block" aria-hidden="true" />
        </div>
      </div>
    </AppShell>
  );
}

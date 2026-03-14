"use client";

import { useFeedsPosts } from "@/app/feeds/FeedsPostsContext";

export function FeedsPostList() {
  const { posts } = useFeedsPosts();

  return (
    <div className="space-y-5 lg:space-y-6">
      {posts.map((post, idx) =>
        post.surface === "Launch" && post.launchName ? (
        <article
          key={post.id}
          className="flex gap-4 rounded-2xl border border-white/8 bg-[#0f1419] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.06] sm:p-5"
        >
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
              <span className="text-slate-500">{idx + 1}.</span> {post.launchName}
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
              Launched by {post.authorName} · {post.authorTag}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-white/[0.06] px-3 py-2 ring-1 ring-white/8">
            <svg className="h-4 w-4 text-emerald-400/90" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 4l8 14H4L12 4zm0 4.5L7.5 16h9L12 8.5z" />
            </svg>
            <span className="mt-1 text-sm font-semibold tabular-nums text-slate-300">{post.likes}</span>
          </div>
        </article>
        ) : (
        <article
          key={post.id}
          className="overflow-hidden rounded-2xl border border-white/8 bg-[#0f1419] shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.06]"
        >
          <div className="flex items-start gap-3 p-4 pb-3 sm:p-5">
            {post.avatarUrl ? (
              <div
                className="h-11 w-11 shrink-0 rounded-xl bg-cover bg-center ring-2 ring-white/10 sm:h-12 sm:w-12"
                style={{ backgroundImage: `url(${post.avatarUrl})` }}
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-500 text-lg ring-2 ring-white/10 sm:h-12 sm:w-12">
                {post.avatarEmoji || (
                  <span className="text-sm font-bold text-slate-950">
                    {post.authorName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <p className="font-semibold text-white sm:text-base">
                  {post.authorName}
                </p>
                {post.surface && post.surface !== "Post" && (
                  <span className="rounded-full bg-[#1e3a5f]/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200 ring-1 ring-sky-500/25">
                    {post.surface}
                  </span>
                )}
                <button
                  type="button"
                  className="shrink-0 rounded-lg bg-[#1e3a5f] px-3 py-1 text-xs font-semibold text-white ring-1 ring-sky-500/30 sm:px-4 sm:py-1.5 sm:text-sm"
                >
                  Follow
                </button>
              </div>
              <p className="text-xs text-slate-500">{post.timeLabel}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-600">
                {post.authorTag}
              </p>
            </div>
            <button
              type="button"
              aria-label="Share"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186z"
                />
              </svg>
            </button>
          </div>
          <p className="px-4 pb-3 text-sm text-slate-200 sm:px-5">
            {post.caption.trim() || "\u00A0"}
          </p>
          <div
            className={`relative w-full bg-slate-900 ${
              post.imageUrl
                ? "aspect-[4/3] sm:aspect-video"
                : "flex min-h-[120px] items-center justify-center border-t border-white/5"
            }`}
          >
            {post.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-start gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-16">
                  <div className="flex items-end gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-white">
                        {post.likes}
                      </span>
                      <button
                        type="button"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm"
                        aria-label="Love"
                      >
                        <svg
                          className="h-5 w-5 text-white"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden
                        >
                          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.003-.003.001a.75.75 0 01-.704 0l-.003-.001z" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-white">
                        {post.comments}
                      </span>
                      <button
                        type="button"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm"
                        aria-label="Comment"
                      >
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
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex w-full flex-col items-center justify-center gap-3 py-8">
                <div className="flex items-end gap-3 px-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-semibold text-white">
                      {post.likes}
                    </span>
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10"
                      aria-label="Love"
                    >
                      <svg
                        className="h-5 w-5 text-white"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden
                      >
                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.003-.003.001a.75.75 0 01-.704 0l-.003-.001z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-semibold text-white">
                      {post.comments}
                    </span>
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10"
                      aria-label="Comment"
                    >
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
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600">Text-only post</p>
              </div>
            )}
          </div>
        </article>
        )
      )}
    </div>
  );
}

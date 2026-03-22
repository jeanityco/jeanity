"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { FeedPost } from "@/features/feeds/feedsPostTypes";
import { normalizeUserTag, publicProfilePath } from "@/lib/profilePath";

type StoryViewerState = {
  stories: FeedPost[];
  initialIndex: number;
} | null;

const StoryViewerContext = createContext<{
  openViewer: (stories: FeedPost[], initialIndex?: number) => void;
  closeViewer: () => void;
} | null>(null);

export function useStoryViewer() {
  const ctx = useContext(StoryViewerContext);
  return ctx ?? { openViewer: () => {}, closeViewer: () => {} };
}

function formatStoryTime(label: string): string {
  const s = label.replace(/^Posted\s*·\s*/i, "").trim();
  return s || "Just now";
}

/** Instagram-style ~5–10s per story segment */
function randomStoryDurationMs(): number {
  return 5000 + Math.random() * 5000;
}

function StoryContentView({ story }: { story: FeedPost }) {
  const isTextStory = !story.imageUrl && story.caption?.trim();
  if (isTextStory) {
    return (
      <div className="flex min-h-[280px] w-full items-center justify-center p-8">
        <div className="max-w-md rounded-2xl bg-gradient-to-br from-fuchsia-600/90 via-violet-600/90 to-indigo-800/90 px-8 py-10 text-center shadow-xl ring-1 ring-white/10">
          <p className="whitespace-pre-wrap text-lg font-medium leading-relaxed text-white antialiased sm:text-xl">
            {story.caption.trim()}
          </p>
        </div>
      </div>
    );
  }
  if (story.imageUrl) {
    return (
      <div className="relative min-h-0 flex-1 w-full overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={story.imageUrl}
          alt=""
          className="h-full w-full object-cover object-bottom"
        />
        {story.caption?.trim() && (
          <div className="absolute bottom-4 left-0 right-0 px-4 text-center">
            <p className="rounded-xl bg-black/50 px-4 py-2 text-sm text-white backdrop-blur-sm">
              {story.caption.trim()}
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
}

function StoryViewerModal({
  stories,
  initialIndex,
  onClose,
}: {
  stories: FeedPost[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [segmentProgress, setSegmentProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  const current = stories[index];
  const prevStory = index > 0 ? stories[index - 1] : null;
  const nextStory = index < stories.length - 1 ? stories[index + 1] : null;

  /** Side preview + arrows only when multiple people have stories; one author uses segments + timer only. */
  const showPeerStoryRail = useMemo(() => {
    const authors = new Set<string>();
    for (const s of stories) {
      authors.add(normalizeUserTag(s.authorTag).toLowerCase());
    }
    return authors.size > 1;
  }, [stories]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useLayoutEffect(() => {
    setSegmentProgress(0);
    setPaused(false);
  }, [index]);

  useEffect(() => {
    const durationMs = randomStoryDurationMs();
    const start = performance.now();
    let accumulatedPause = 0;
    let pauseBeganAt: number | null = null;
    let raf = 0;

    const tick = (now: number) => {
      if (pausedRef.current) {
        if (pauseBeganAt === null) pauseBeganAt = now;
        raf = requestAnimationFrame(tick);
        return;
      }
      if (pauseBeganAt !== null) {
        accumulatedPause += now - pauseBeganAt;
        pauseBeganAt = null;
      }

      const elapsed = now - start - accumulatedPause;
      const p = Math.min(1, elapsed / durationMs);
      setSegmentProgress(p);

      if (p >= 1) {
        if (index < stories.length - 1) {
          setIndex((i) => i + 1);
        } else {
          queueMicrotask(() => onClose());
        }
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, onClose, stories.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(stories.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, stories.length]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-[#0c0c0c]"
      role="dialog"
      aria-modal="true"
      aria-label="Story"
    >
      {/* Top bar: close */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-end px-4 py-3">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main: optional left/right peer rails when multiple authors; single author = full-width card + segment progress */}
      <div className="flex flex-1 items-stretch overflow-hidden">
        {showPeerStoryRail && (
          <div className="flex w-[22%] min-w-0 items-center justify-end pr-1 sm:w-[28%] sm:pr-2">
            {prevStory ? (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="group flex flex-1 items-center justify-end gap-1"
                aria-label="Previous story"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-sm transition group-hover:bg-black/60 sm:h-10 sm:w-10">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </span>
                <div className="relative h-[120px] w-[70px] overflow-hidden rounded-xl border border-white/10 opacity-70 sm:h-[140px] sm:w-[90px]">
                  {prevStory.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={prevStory.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-600/80 to-indigo-800/80 p-2">
                      <span className="line-clamp-3 text-center text-[10px] font-medium text-white/90">
                        {prevStory.caption?.trim() || "Text"}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        )}

        {/* Center: current story */}
        <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center px-2 py-4 sm:px-4">
          <div className="relative flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10 sm:max-w-[480px]">
            {/* Story content */}
            <div className="relative flex min-h-[480px] flex-1 flex-col sm:min-h-[580px]">
              {/* Progress segments (Instagram-style) */}
              <div
                className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex gap-1 px-2.5 pb-1 pt-2.5 sm:px-3 sm:pt-3"
                aria-hidden
              >
                {stories.map((_, i) => {
                  const fill =
                    i < index ? 1 : i > index ? 0 : segmentProgress;
                  return (
                    <div
                      key={i}
                      className="h-[2.5px] min-w-0 flex-1 overflow-hidden rounded-full bg-white/20"
                    >
                      <div
                        className="h-full rounded-full bg-white/95"
                        style={{ width: `${fill * 100}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              <StoryContentView story={current} />

              {/* Left / right tap: previous & next story (below header overlays) */}
              <div className="absolute inset-0 z-20 flex touch-manipulation">
                <button
                  type="button"
                  aria-label="Previous story"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  className="h-full w-1/2 min-w-0 border-0 bg-transparent p-0"
                />
                <button
                  type="button"
                  aria-label="Next story"
                  onClick={() => setIndex((i) => Math.min(stories.length - 1, i + 1))}
                  className="h-full w-1/2 min-w-0 border-0 bg-transparent p-0"
                />
              </div>

              {/* Overlay top-left: avatar, name, time */}
              <div className="absolute left-0 top-0 z-40 flex items-center gap-2.5 p-3 pt-10 sm:gap-3 sm:p-4 sm:pt-11">
                <Link
                  href={publicProfilePath(current.authorTag)}
                  prefetch={false}
                  onClick={() => onClose()}
                  aria-label={`${current.authorTag?.replace(/^@/, "") || current.authorName} profile`}
                  className="shrink-0 rounded-lg no-underline hover:no-underline focus-visible:rounded-lg focus-visible:shadow-none focus-visible:ring-2 focus-visible:ring-white/45"
                >
                  <div className="h-10 w-10 overflow-hidden rounded-lg ring-2 ring-white/30 sm:h-11 sm:w-11">
                    {current.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={current.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-600 to-cyan-500 text-base font-bold text-white sm:text-lg">
                        {current.avatarEmoji ?? current.authorName?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="min-w-0">
                  <Link
                    href={publicProfilePath(current.authorTag)}
                    prefetch={false}
                    onClick={() => onClose()}
                    className="block truncate text-base font-semibold text-white no-underline drop-shadow-md visited:text-white hover:text-white hover:no-underline sm:text-[17px]"
                  >
                    {current.authorTag?.replace(/^@/, "") || current.authorName}
                  </Link>
                  <p className="text-xs text-white/80 sm:text-[13px]">{formatStoryTime(current.timeLabel)}</p>
                </div>
              </div>

              {/* Overlay top-right: pause */}
              <div className="absolute right-0 top-0 z-40 flex items-center gap-1 p-3 pt-10 sm:p-4 sm:pt-11">
                <button
                  type="button"
                  aria-label={paused ? "Resume" : "Pause"}
                  aria-pressed={paused}
                  onClick={() => setPaused((p) => !p)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white sm:h-10 sm:w-10"
                >
                  {paused ? (
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M8 5v14l11-7L8 5z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {showPeerStoryRail && (
          <div className="flex w-[22%] min-w-0 items-center justify-start pl-1 sm:w-[28%] sm:pl-2">
            {nextStory ? (
              <button
                type="button"
                onClick={() => setIndex((i) => i + 1)}
                className="group flex flex-1 items-center justify-start gap-1"
                aria-label="Next story"
              >
                <div className="relative h-[120px] w-[70px] overflow-hidden rounded-xl border border-white/10 opacity-70 sm:h-[140px] sm:w-[90px]">
                  {nextStory.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={nextStory.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-600/80 to-indigo-800/80 p-2">
                      <span className="line-clamp-3 text-center text-[10px] font-medium text-white/90">
                        {nextStory.caption?.trim() || "Text"}
                      </span>
                    </div>
                  )}
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-sm transition group-hover:bg-black/60 sm:h-10 sm:w-10">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function StoryViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoryViewerState>(null);

  const openViewer = useCallback((stories: FeedPost[], initialIndex = 0) => {
    const storyPosts = stories.filter((p) => p.surface === "Story");
    if (storyPosts.length === 0) return;
    setState({
      stories: storyPosts,
      initialIndex: Math.min(initialIndex, storyPosts.length - 1),
    });
  }, []);

  const closeViewer = useCallback(() => setState(null), []);

  const modal =
    state &&
    createPortal(
      <StoryViewerModal
        stories={state.stories}
        initialIndex={state.initialIndex}
        onClose={closeViewer}
      />,
      document.body
    );

  return (
    <StoryViewerContext.Provider value={{ openViewer, closeViewer }}>
      {children}
      {modal}
    </StoryViewerContext.Provider>
  );
}
